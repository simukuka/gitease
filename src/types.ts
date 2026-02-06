/**
 * Suggestion from Copilot with command and explanation
 */
export interface CopilotSuggestion {
  command: string;
  explanation: string;
}

/**
 * Risk level for Git operations
 */
export enum RiskLevel {
  Safe = 'safe',
  Warning = 'warning',
  Dangerous = 'dangerous',
}

/**
 * Safety analysis of a Git command
 */
export interface SafetyAnalysis {
  riskLevel: RiskLevel;
  message: string;
  reversible: boolean;
  affectedItems: string[];
}

/**
 * A single step in a multi-command workflow
 */
export interface WorkflowStep {
  command: string;
  explanation: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  output?: string;
  error?: string;
}

/**
 * A workflow is an ordered list of git commands that accomplish a compound task
 */
export interface Workflow {
  steps: WorkflowStep[];
  description: string;
  /** Whether to stop on first failure or continue */
  stopOnFailure: boolean;
}

/**
 * Result of a conflict check
 */
export interface ConflictInfo {
  hasConflicts: boolean;
  conflictFiles: string[];
}

/**
 * Entry in the undo ledger
 */
export interface LedgerEntry {
  id: string;
  timestamp: Date;
  description: string;
  command: string;
  status: 'success' | 'failed';
  reversalCommand?: string;
}
