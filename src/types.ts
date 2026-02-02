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
