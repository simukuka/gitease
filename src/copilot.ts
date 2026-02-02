import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Interface for Copilot suggestion
 */
export interface CopilotSuggestion {
  command: string;
  explanation: string;
}

/**
 * Get command suggestion from GitHub Copilot
 */
export async function getCopilotSuggestion(query: string): Promise<CopilotSuggestion> {
  try {
    // Use the new Copilot CLI syntax with --prompt flag
    const { stdout, stderr } = await execAsync(`gh copilot --prompt "${query}"`);
    
    // DEBUG: Show what Copilot actually returns
    console.log('\n' + '='.repeat(60));
    console.log('DEBUG: Raw Copilot Output');
    console.log('='.repeat(60));
    console.log(stdout);
    console.log('='.repeat(60) + '\n');
    
    // Parse the output
    const suggestion = parseCopilotOutput(stdout);
    
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
 * Check if GitHub Copilot is available
 */
export async function isCopilotAvailable(): Promise<boolean> {
  try {
    await execAsync('gh copilot --help');
    return true;
  } catch (error) {
    return false;
  }
}