import { exec } from 'child_process';
import { promisify } from 'util';
import { CopilotSuggestion } from './types.js';
import { COPILOT_PROMPT_CONSTRAINTS } from './constants.js';

const execAsync = promisify(exec);

/**
 * Get command suggestion from GitHub Copilot with timeout
 */
export async function getCopilotSuggestion(query: string): Promise<CopilotSuggestion> {
  try {
    const prompt = [...COPILOT_PROMPT_CONSTRAINTS, `User request: ${query}`].join('\n');
    
    // Create a promise that times out after 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Copilot request timed out after 30 seconds. Make sure `gh` CLI is installed and authenticated.')), 30000)
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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect code block start
    if (line.includes('```bash') || line.includes('```sh') || line.includes('```')) {
      inCodeBlock = true;
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
    
    // Collect explanation (text before code blocks)
    if (!inCodeBlock && line.trim().length > 0 && !line.includes('```')) {
      // Skip the statistics lines at the end
      if (!line.includes('Total usage') && 
          !line.includes('API time') && 
          !line.includes('session time') &&
          !line.includes('code changes') &&
          !line.includes('Breakdown by') &&
          !line.includes('claude-') &&
          !line.includes('The last commit was:')) {
        explanationLines.push(line.trim());
      }
    }
  }
  
  // Join explanation lines
  explanation = explanationLines.slice(0, 3).join(' '); // Take first 3 lines
  
  // Clean up explanation
  explanation = explanation
    .replace(/^Let me try a different approach:\s*/i, '')
    .replace(/^You may need elevated permissions\.\s*/i, '')
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
    const testPrompt = 'Return just: "test"';
    const { stdout } = await execAsync(`gh copilot --prompt "${testPrompt}"`, { 
      timeout: 10000,  // 10 second timeout for the test
      maxBuffer: 1024 * 1024 
    });
    
    // If we get here, it works
    return true;
  } catch (error) {
    return false;
  }
}