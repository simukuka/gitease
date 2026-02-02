/**
 * Copilot prompt constraints
 */
export const COPILOT_PROMPT_CONSTRAINTS = [
  'Return exactly one safe git command only. Do not chain commands.',
  'Prefer the simplest command that satisfies the request.',
  'Wrap the command in a bash code block.',
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
};
