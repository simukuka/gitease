/**
 * Copilot prompt constraints for single commands
 */
export const COPILOT_PROMPT_CONSTRAINTS = [
  'Return exactly one safe git command only. Do not chain commands.',
  'Prefer the simplest command that satisfies the request.',
  'Wrap the command in a bash code block.',
];

/**
 * Copilot prompt constraints for workflow (multi-step) operations
 */
export const COPILOT_WORKFLOW_PROMPT_CONSTRAINTS = [
  'Return a numbered list of git commands to accomplish this task.',
  'Each command should be on its own line, prefixed with its step number (e.g. 1. git fetch).',
  'Use only safe git commands. Prefer the simplest approach.',
  'Wrap ALL commands in a single bash code block.',
  'After the code block, briefly explain each step in 1 line.',
  'If a merge or rebase could cause conflicts, include the merge/rebase step and note that conflicts may need resolution.',
];

/**
 * Patterns that indicate the user wants a multi-step workflow
 */
export const WORKFLOW_PATTERNS: RegExp[] = [
  /\band\b/i,
  /\bthen\b/i,
  /\bafter that\b/i,
  /\bsync\b/i,
  /\bupdate.*branch\b/i,
  /\bpull.*merge\b/i,
  /\bmerge.*(?:resolve|fix)\b/i,
  /\bsave.*push\b/i,
  /\bcommit.*push\b/i,
  /\bstage.*commit\b/i,
  /\bfetch.*merge\b/i,
  /\bpull.*rebase\b/i,
  /\bclean.*up\b/i,
  /\bsquash\b/i,
  /\bbackup.*(?:push|save)\b/i,
];

/**
 * Risk detection patterns for dangerous Git commands
 */
export const DANGEROUS_COMMANDS = [
  /^git\s+reset\s+--hard/,
  /^git\s+push\s+--force/,
  /^git\s+rebase\s+-i/,
  /^git\s+clean\s+-fd/,
  /^git\s+rm\s+-r/,
];

/**
 * Reversible operation mappings
 */
export const REVERSIBLE_OPERATIONS: Record<string, string> = {
  'git reset --soft HEAD~': 'git commit',
  'git reset HEAD': 'git add',
  'git revert': 'git reset --hard',
};

/**
 * UI messages
 */
export const MESSAGES = {
  noQuery: 'Error: Please provide a valid query',
  noRepository: 'Error: Not a Git repository',
  copilotUnavailable: 'GitHub Copilot CLI not found',
  copilotLoginTip: "Make sure you're logged in:\n  run gh auth login",
  checking: 'Checking GitHub Copilot...',
  available: 'GitHub Copilot available',
  suggesting: 'Asking Copilot for suggestions...',
  suggests: 'Copilot suggests:',
  noCommand: 'Copilot did not return a runnable git command.',
  confirmRun: 'Run this command? (y/N): ',
  cancelled: 'Cancelled.',
  executing: 'Executing...',
  done: 'Done.',
  failed: 'Command failed',
  noChanges: 'No changes to commit.',
  stageAll: 'No staged changes. Stage all and continue? (y/N): ',
  commitMessage: 'Commit message: ',
  // Workflow-specific messages
  workflowDetected: 'Multi-step workflow detected',
  workflowSuggesting: 'Asking Copilot for a workflow plan...',
  workflowConfirm: 'Run this workflow? (y/N): ',
  workflowStep: 'Step',
  workflowRunning: 'Running workflow...',
  workflowComplete: 'Workflow completed successfully!',
  workflowPartial: 'Workflow partially completed',
  workflowFailed: 'Workflow step failed',
  conflictsDetected: 'Merge conflicts detected!',
  conflictFiles: 'Conflicting files:',
  conflictResolve: 'Would you like to open the conflict files? (y/N): ',
  conflictAbort: 'Abort the merge? (y/N): ',
  conflictContinue: 'After resolving conflicts, run: git add . && git merge --continue',
};
