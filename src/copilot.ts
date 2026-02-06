import { exec } from 'child_process';
import { promisify } from 'util';
import { CopilotSuggestion, Workflow, WorkflowStep } from './types.js';
import { COPILOT_PROMPT_CONSTRAINTS, COPILOT_WORKFLOW_PROMPT_CONSTRAINTS, WORKFLOW_PATTERNS } from './constants.js';

const execAsync = promisify(exec);

/**
 * Get command suggestion from GitHub Copilot with timeout
 */
export async function getCopilotSuggestion(query: string): Promise<CopilotSuggestion> {
  try {
    const prompt = [...COPILOT_PROMPT_CONSTRAINTS, `User request: ${query}`].join('\n');
    
    // Create a promise that times out after 60 seconds (allows for CLI download on first run)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Copilot request timed out after 60 seconds. Make sure `gh` CLI is installed and authenticated.')), 60000)
    );
    
    const execPromise = execAsync(`gh copilot --prompt "${prompt}"`, { maxBuffer: 10 * 1024 * 1024 });
    const { stdout } = await Promise.race([execPromise, timeoutPromise]);
    
    const suggestion = parseCopilotOutput(stdout);
    if (!suggestion.command || suggestion.command === 'No command suggested') {
      throw new Error('Copilot did not return a command');
    }
    
    return suggestion;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get Copilot suggestion: ${errorMsg}`);
  }
}

/**
 * Parse Copilot's output to extract command and explanation
 */
function parseCopilotOutput(output: string): CopilotSuggestion {
  const lines = output.split('\n');
  let command = '';
  let explanation = '';
  let inCodeBlock = false;
  let explanationLines: string[] = [];
  let foundCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect code block start
    if (line.includes('```bash') || line.includes('```sh') || line.includes('```')) {
      inCodeBlock = true;
      foundCodeBlock = true;
      continue;
    }
    
    // Detect code block end
    if (line.includes('```') && inCodeBlock) {
      inCodeBlock = false;
      continue;
    }
    
    // Extract command from code block
    if (inCodeBlock && line.trim().length > 0) {
      const trimmed = line.trim();
      // Skip sudo commands and prefer the git command
      if (trimmed.startsWith('git ') && !command) {
        command = trimmed;
      } else if (trimmed.startsWith('sudo git ') && !command) {
        // Remove sudo prefix
        command = trimmed.replace(/^sudo\s+/, '');
      } else if (!command && trimmed.length > 0) {
        command = trimmed;
      }
    }

    // Extract inline command hints like "$ git status"
    if (!command && !inCodeBlock) {
      const inlineMatch = line.match(/\$\s*(git\s+[^\n`]+)/i);
      if (inlineMatch && inlineMatch[1]) {
        command = inlineMatch[1].trim();
      }
    }
    
    // Collect explanation (any text that's not a code block and not stats)
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && !line.includes('```') && !line.includes('$') && (!trimmedLine.includes('Total usage') && 
              !trimmedLine.includes('API time') && 
              !trimmedLine.includes('session time') &&
              !trimmedLine.includes('code changes') &&
              !trimmedLine.includes('Breakdown by') &&
              !trimmedLine.includes('claude-') &&
              !trimmedLine.includes('The last commit was:') &&
              !trimmedLine.includes('Let me try a different approach:') &&
              !trimmedLine.includes('You may need elevated permissions') &&
              !trimmedLine.startsWith('```') &&
              !trimmedLine.startsWith('git '))) {
          explanationLines.push(trimmedLine);
    }
  }
  
  // Join explanation lines - take first 5 lines for better context
  explanation = explanationLines
    .slice(0, 5)
    .filter(line => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  if (!explanation) {
    explanation = 'Copilot suggests this command';
  }
  
  return {
    command: command || 'No command suggested',
    explanation
  };
}

/**
 * Check if GitHub Copilot is available AND can make API calls
 */
export async function isCopilotAvailable(): Promise<boolean> {
  try {
    // First check if command exists
    await execAsync('gh copilot --help');
    
    // Then try a simple actual call to verify it works
    // Note: First time may auto-download Copilot CLI, so use longer timeout (45 seconds)
    const testPrompt = 'Return just: "test"';
    const { stdout } = await execAsync(`gh copilot --prompt "${testPrompt}"`, { 
      timeout: 45000,  // 45 second timeout to allow CLI download on first run
      maxBuffer: 1024 * 1024 
    });
    
    // If we get here, it works
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Detect if a query implies a multi-step workflow
 */
export function isWorkflowQuery(query: string): boolean {
  return WORKFLOW_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Get a multi-step workflow suggestion from GitHub Copilot
 */
export async function getCopilotWorkflow(query: string): Promise<Workflow> {
  try {
    const prompt = [
      ...COPILOT_WORKFLOW_PROMPT_CONSTRAINTS,
      `User request: ${query}`,
    ].join('\n');

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Copilot request timed out after 60 seconds.')), 60000)
    );

    const execPromise = execAsync(`gh copilot --prompt "${prompt}"`, { maxBuffer: 10 * 1024 * 1024 });
    const { stdout } = await Promise.race([execPromise, timeoutPromise]);

    const workflow = parseWorkflowOutput(stdout, query);
    if (workflow.steps.length === 0) {
      throw new Error('Copilot did not return any workflow steps');
    }

    return workflow;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get Copilot workflow: ${errorMsg}`);
  }
}

/**
 * Parse Copilot output into a multi-step workflow
 */
function parseWorkflowOutput(output: string, description: string): Workflow {
  const lines = output.split('\n');
  const steps: WorkflowStep[] = [];
  let inCodeBlock = false;
  const explanationLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect code block boundaries
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock && trimmed.length > 0) {
      // Strip leading step numbers like "1. ", "2) ", "- "
      let cmd = trimmed
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/^-\s+/, '')
        .replace(/^sudo\s+/, '')
        .trim();

      // Only accept git commands
      if (cmd.startsWith('git ')) {
        steps.push({
          command: cmd,
          explanation: '',
          status: 'pending',
        });
      }
    } else if (!inCodeBlock && trimmed.length > 0) {
      // Collect explanation text (skip noise)
      const noise = [
        'Total usage', 'API time', 'session time', 'code changes',
        'Breakdown by', 'claude-', 'The last commit was',
      ];
      if (!noise.some(n => trimmed.includes(n)) && !trimmed.startsWith('```')) {
        explanationLines.push(trimmed);
      }
    }
  }

  // Try to match explanation lines to steps (e.g. "1. fetches..." → step 0)
  for (const expLine of explanationLines) {
    const match = expLine.match(/^(\d+)[\.\)]\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < steps.length) {
        steps[idx].explanation = match[2].trim();
      }
    }
  }

  // Fill in any missing explanations
  for (const step of steps) {
    if (!step.explanation) {
      step.explanation = describeGitCommand(step.command);
    }
  }

  return {
    steps,
    description,
    stopOnFailure: true,
  };
}

/**
 * Simple fallback description for a git command
 */
function describeGitCommand(cmd: string): string {
  if (cmd.startsWith('git fetch')) return 'Fetch latest changes from remote';
  if (cmd.startsWith('git pull')) return 'Pull and integrate remote changes';
  if (cmd.startsWith('git merge')) return 'Merge branches together';
  if (cmd.startsWith('git rebase')) return 'Rebase current branch';
  if (cmd.startsWith('git add')) return 'Stage changes';
  if (cmd.startsWith('git commit')) return 'Commit staged changes';
  if (cmd.startsWith('git push')) return 'Push commits to remote';
  if (cmd.startsWith('git checkout')) return 'Switch branches/restore files';
  if (cmd.startsWith('git stash')) return 'Stash working changes';
  if (cmd.startsWith('git branch')) return 'Manage branches';
  if (cmd.startsWith('git reset')) return 'Reset changes';
  if (cmd.startsWith('git log')) return 'Show commit history';
  return 'Execute git operation';
}