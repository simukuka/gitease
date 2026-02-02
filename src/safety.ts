import { RiskLevel, SafetyAnalysis } from './types.js';
import { DANGEROUS_COMMANDS, REVERSIBLE_OPERATIONS } from './constants.js';

/**
 * Analyze a Git command for safety
 */
export function analyzeCommand(command: string): SafetyAnalysis {
  const trimmed = command.trim();

  // Check for dangerous commands
  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(trimmed)) {
      return {
        riskLevel: RiskLevel.Dangerous,
        message: '⚠️  This command can irreversibly delete or modify commits',
        reversible: false,
        affectedItems: extractAffectedItems(trimmed),
      };
    }
  }

  // Check for warning-level commands
  if (/^git\s+push/.test(trimmed)) {
    return {
      riskLevel: RiskLevel.Warning,
      message: '⚠️  This will push changes to the remote repository',
      reversible: true,
      affectedItems: extractAffectedItems(trimmed),
    };
  }

  if (/^git\s+rebase/.test(trimmed)) {
    return {
      riskLevel: RiskLevel.Warning,
      message: '⚠️  This will rewrite commit history',
      reversible: true,
      affectedItems: extractAffectedItems(trimmed),
    };
  }

  // Safe commands
  return {
    riskLevel: RiskLevel.Safe,
    message: 'This operation is safe',
    reversible: true,
    affectedItems: [],
  };
}

/**
 * Extract affected items from a command
 */
function extractAffectedItems(command: string): string[] {
  const items: string[] = [];

  // Extract branch names
  const branchMatch = command.match(/(?:checkout|switch)\s+([^\s]+)/);
  if (branchMatch) items.push(`branch: ${branchMatch[1]}`);

  // Extract file paths
  const fileMatches = command.match(/(?:add|rm|checkout)\s+(.+)/);
  if (fileMatches) items.push(`file: ${fileMatches[1]}`);

  return items;
}

/**
 * Check if a command is reversible
 */
export function isReversible(command: string): boolean {
  const trimmed = command.trim();
  return !DANGEROUS_COMMANDS.some((pattern) => pattern.test(trimmed));
}

/**
 * Get reversal command for a Git operation
 */
export function getReversalCommand(command: string): string | null {
  for (const [original, reversal] of Object.entries(REVERSIBLE_OPERATIONS)) {
    if (command.includes(original)) {
      return reversal;
    }
  }
  return null;
}
