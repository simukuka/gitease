#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isGitRepository, getCurrentBranch, getRepoStatus, hasCommits, checkConflicts, abortMerge, listLocalBranches, listRemoteBranches } from './git.js';
import { getCopilotSuggestion, isCopilotAvailable, isWorkflowQuery, getCopilotWorkflow } from './copilot.js';
import { analyzeCommand, isReversible } from './safety.js';
import { addLedgerEntry, getLedger, getLastCommand } from './ledger.js';
import { MESSAGES } from './constants.js';
import { RiskLevel, CopilotSuggestion, Workflow, WorkflowStep } from './types.js';
import { printSuccess, printError, printWarning, printCommand, printRiskBadge, Spinner, printWorkflowPlan, printStepStatus, printConflicts } from './ui.js';

const program = new Command();
const execAsync = promisify(exec);

async function promptYesNo(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      const answer = String(data).trim().toLowerCase();
      process.stdin.pause();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
}

async function promptInput(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      const answer = String(data).trim();
      process.stdin.pause();
      resolve(answer);
    });
  });
}

async function showRiskPreview(command: string): Promise<void> {
  try {
    console.log(chalk.gray('\nPreview:'));

    if (command.startsWith('git commit')) {
      const { stdout } = await execAsync('git diff --staged');
      if (stdout) {
        const lines = stdout.trim().split('\n').slice(0, 15);  // Limit to 15 lines
        console.log(chalk.gray(lines.join('\n')));
        if (stdout.trim().split('\n').length > 15) {
          console.log(chalk.gray('... (and more changes)'));
        }
      } else {
        console.log(chalk.gray('(no staged changes)'));
      }
      return;
    }

    if (command.startsWith('git add')) {
      const { stdout } = await execAsync('git diff');
      if (stdout) {
        const lines = stdout.trim().split('\n').slice(0, 15);  // Limit to 15 lines
        console.log(chalk.gray(lines.join('\n')));
        if (stdout.trim().split('\n').length > 15) {
          console.log(chalk.gray('... (and more changes)'));
        }
      } else {
        console.log(chalk.gray('(no unstaged changes)'));
      }
      return;
    }

    if (command.startsWith('git checkout') || command.startsWith('git reset') || command.startsWith('git clean')) {
      const status = await execAsync('git status -sb');
      if (status.stdout) {
        const lines = status.stdout.trim().split('\n').slice(0, 10);  // Limit to 10 lines
        console.log(chalk.gray(lines.join('\n')));
        if (status.stdout.trim().split('\n').length > 10) {
          console.log(chalk.gray('... (and more)'));
        }
      }
      return;
    }

    if (command.startsWith('git merge') || command.startsWith('git rebase')) {
      const { stdout } = await execAsync('git log --oneline --decorate -n 5');
      if (stdout) {
        console.log(chalk.gray(stdout.trim()));
      }
      return;
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Unable to show preview'));
  }
}

/**
 * Handle a multi-step workflow query — plan, confirm, execute steps sequentially
 */
async function handleWorkflow(query: string): Promise<void> {
  console.log(chalk.bold.magenta(`\n🔄 ${MESSAGES.workflowDetected}\n`));

  let workflow: Workflow;
  try {
    const spinner = new Spinner(MESSAGES.workflowSuggesting);
    spinner.start();
    workflow = await getCopilotWorkflow(query);
    spinner.stop();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    printError(errorMsg);
    process.exit(1);
  }

  // Show the plan
  printWorkflowPlan(workflow.steps);

  // Safety check — flag any dangerous steps
  for (const step of workflow.steps) {
    const safety = analyzeCommand(step.command);
    if (safety.riskLevel === RiskLevel.Dangerous) {
      console.log(
        printRiskBadge('dangerous') +
        chalk.yellow(` Step "${step.command}" — ${safety.message}`)
      );
    }
  }

  // Confirm
  const shouldRun = await promptYesNo(chalk.yellow(MESSAGES.workflowConfirm));
  if (!shouldRun) {
    console.log(chalk.gray(MESSAGES.cancelled));
    return;
  }

  console.log(chalk.blue(`\n▶ ${MESSAGES.workflowRunning}\n`));

  // Execute steps sequentially
  let completedSteps = 0;
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    step.status = 'running';
    printStepStatus(i, workflow.steps.length, step);

    try {
      const { stdout, stderr } = await execAsync(step.command);
      step.status = 'success';
      step.output = [stdout, stderr].filter(Boolean).join('\n').trim();
      printStepStatus(i, workflow.steps.length, step);
      completedSteps++;

      // After merge/pull/rebase, check for conflicts
      if (/^git\s+(merge|pull|rebase)/.test(step.command)) {
        const conflictInfo = await checkConflicts();
        if (conflictInfo.hasConflicts) {
          printConflicts(conflictInfo.conflictFiles);

          // Offer to abort the merge
          const shouldAbort = await promptYesNo(chalk.yellow(MESSAGES.conflictAbort));
          if (shouldAbort) {
            await abortMerge();
            printWarning('Merge aborted.');
            // Mark remaining steps as skipped
            for (let j = i + 1; j < workflow.steps.length; j++) {
              workflow.steps[j].status = 'skipped';
              printStepStatus(j, workflow.steps.length, workflow.steps[j]);
            }
            break;
          }

          // Otherwise, tell the user how to continue
          console.log(chalk.yellow(`\n💡 ${MESSAGES.conflictContinue}`));
          // Mark remaining steps as skipped since user needs to resolve manually
          for (let j = i + 1; j < workflow.steps.length; j++) {
            workflow.steps[j].status = 'skipped';
            printStepStatus(j, workflow.steps.length, workflow.steps[j]);
          }
          break;
        }
      }

      // Log each step to ledger
      addLedgerEntry({
        description: `[workflow ${i + 1}/${workflow.steps.length}] ${query}`,
        command: step.command,
        status: 'success',
        reversalCommand: isReversible(step.command) ? 'git reflog' : undefined,
      });
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      printStepStatus(i, workflow.steps.length, step);

      addLedgerEntry({
        description: `[workflow ${i + 1}/${workflow.steps.length}] ${query}`,
        command: step.command,
        status: 'failed',
      });

      // After a failed merge/pull, check for conflicts specifically
      if (/^git\s+(merge|pull|rebase)/.test(step.command)) {
        const conflictInfo = await checkConflicts();
        if (conflictInfo.hasConflicts) {
          printConflicts(conflictInfo.conflictFiles);
          const shouldAbort = await promptYesNo(chalk.yellow(MESSAGES.conflictAbort));
          if (shouldAbort) {
            await abortMerge();
            printWarning('Merge aborted.');
          } else {
            console.log(chalk.yellow(`\n💡 ${MESSAGES.conflictContinue}`));
          }
        }
      }

      if (workflow.stopOnFailure) {
        // Skip remaining steps
        for (let j = i + 1; j < workflow.steps.length; j++) {
          workflow.steps[j].status = 'skipped';
          printStepStatus(j, workflow.steps.length, workflow.steps[j]);
        }
        break;
      }
    }
  }

  // Summary
  console.log();
  if (completedSteps === workflow.steps.length) {
    printSuccess(MESSAGES.workflowComplete);
  } else if (completedSteps > 0) {
    printWarning(`${MESSAGES.workflowPartial} (${completedSteps}/${workflow.steps.length} steps succeeded)`);
  } else {
    printError(MESSAGES.workflowFailed);
  }

  process.exit(completedSteps === workflow.steps.length ? 0 : 1);
}

program
  .name('gitease')
  .description('Git commands in plain English using AI')
  .version('0.1.0');

program
  .argument('[query]', 'What you want to do in plain English')
  .action(async (query?: string) => {
    try {
      // Validate input
      if (!query || query.trim().length === 0) {
        console.log(chalk.red(MESSAGES.noQuery));
        console.log(chalk.yellow('\n💡 Example:'));
        console.log(chalk.gray('  gitease "undo my last commit"'));
        process.exit(1);
      }

      const isRepo = await isGitRepository();
      
      if (!isRepo) {
        console.log(chalk.red(`\n${MESSAGES.noRepository}`));
        console.log(chalk.yellow('\n💡 Tip: Navigate to a Git repository first'));
        process.exit(1);
      }

      // Get current branch
      const hasAnyCommits = await hasCommits();
      if (hasAnyCommits) {
        try {
          const branch = await getCurrentBranch();
          console.log(chalk.green(`Git repository detected (branch: ${branch})\n`));
        } catch (error) {
          console.log(chalk.green('Git repository detected\n'));
        }
      } else {
        console.log(chalk.green('Git repository detected\n'));
      }

      // Check if Copilot is available
      const spinner = new Spinner('Checking GitHub Copilot...');
      spinner.start();
      const copilotAvailable = await isCopilotAvailable();
      spinner.stop();
      
      if (!copilotAvailable) {
        printError(MESSAGES.copilotUnavailable);
        console.log(chalk.yellow('\n📋 Setup steps:'));
        console.log(chalk.gray('  1. Install GitHub CLI: brew install gh'));
        console.log(chalk.gray('  2. Authenticate: gh auth login'));
        console.log(chalk.gray('  3. Install Copilot: gh extension install github/gh-copilot'));
        console.log(chalk.gray('  4. Verify: gh copilot --help'));
        console.log(chalk.yellow(`\n💡 ${MESSAGES.copilotLoginTip}`));
        process.exit(1);
      }
      
      printSuccess(MESSAGES.available);

    // Detect multi-step workflow queries
    if (isWorkflowQuery(query)) {
      await handleWorkflow(query);
      return;
    }

    // Get suggestion from Copilot
    let suggestion: CopilotSuggestion;
    try {
      const spinner = new Spinner('Asking Copilot for suggestions...');
      spinner.start();
      suggestion = await getCopilotSuggestion(query);
      spinner.stop();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      printError(errorMsg);
      console.log(chalk.yellow('\n💡 Common fixes:'));
      console.log(chalk.gray('  • Make sure you have an active GitHub Copilot subscription'));
      console.log(chalk.gray('  • Try: gh auth refresh'));
      console.log(chalk.gray('  • Or reinstall the extension: gh extension upgrade github/gh-copilot'));
      console.log(chalk.gray('  • Check: gh copilot --help'));
      
      if (process.env.DEBUG) {
        console.log(chalk.red('\n🐛 Error details:'));
        console.log(chalk.red(errorMsg));
      }
      process.exit(1);
    }

    console.log(chalk.green('\n✨ Copilot suggests:\n'));
    printCommand(suggestion.command);
    console.log(chalk.gray(`   ${suggestion.explanation}\n`));

    if (!suggestion.command || suggestion.command === 'No command suggested' || !suggestion.command.trim().startsWith('git ')) {
      printError(MESSAGES.noCommand);
      return;
    }

    let command = suggestion.command.trim();

    // Analyze command safety
    const safety = analyzeCommand(command);
    if (safety.riskLevel !== RiskLevel.Safe) {
      console.log(printRiskBadge(safety.riskLevel.toLowerCase() as 'safe' | 'warning' | 'dangerous') + ' ' + chalk.yellow(safety.message));
      await showRiskPreview(command);
      if (!isReversible(command)) {
        const proceed = await promptYesNo(chalk.red('\n⚠️  This operation cannot be undone. Proceed? (y/N): '));
        if (!proceed) {
          console.log(chalk.gray(MESSAGES.cancelled));
          return;
        }
      }
    }

    if (/^git\s+commit/.test(command) && !/-m\s+["']/.test(command)) {
      const message = await promptInput(chalk.yellow(MESSAGES.commitMessage));
      if (!message) {
        console.log(chalk.gray(MESSAGES.cancelled));
        return;
      }
      const safeMessage = message.replace(/"/g, '\\"');
      command = `git commit -m "${safeMessage}"`;
    }

    if (command.startsWith('git commit')) {
      const isAmend = command.includes('--amend');
      
      if (!isAmend) {
        const status = await getRepoStatus();
        const hasChanges = status.modified.length > 0 || status.staged.length > 0 || status.not_added.length > 0;
        if (!hasChanges) {
          console.log(chalk.yellow(`\n${MESSAGES.noChanges}`));
          return;
        }
        if (status.staged.length === 0) {
          const stageAll = await promptYesNo(chalk.yellow(MESSAGES.stageAll));
          if (!stageAll) {
            console.log(chalk.gray(MESSAGES.cancelled));
            return;
          }
          await execAsync('git add -A');
        }
      }
    }

    const shouldRun = await promptYesNo(chalk.yellow(MESSAGES.confirmRun));
    if (!shouldRun) {
      console.log(chalk.gray(MESSAGES.cancelled));
      return;
    }

    try {
      console.log(chalk.blue(`\n▶ ${MESSAGES.executing}`));
      const { stdout, stderr } = await execAsync(command);
      if (stdout) {
        console.log(chalk.gray(stdout.trim()));
      }
      if (stderr) {
        console.log(chalk.yellow(stderr.trim()));
      }
      printSuccess(MESSAGES.done);
      
      // Log to ledger
      addLedgerEntry({
        description: query,
        command,
        status: 'success',
        reversalCommand: isReversible(command) ? 'git reflog' : undefined,
      });
      
      process.exit(0);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      // Smart recovery: branch not found on checkout/switch
      if (/^git\s+(checkout|switch)/.test(command) && /pathspec.*did not match|invalid reference/.test(errMsg)) {
        const branchMatch = command.match(/(?:checkout|switch)\s+(?:-b\s+)?([^\s]+)/);
        const targetBranch = branchMatch ? branchMatch[1] : null;

        if (targetBranch) {
          console.log(chalk.yellow(`\n⚠️  Branch "${targetBranch}" doesn't exist locally.`));

          // Check remote
          const remoteBranches = await listRemoteBranches();
          if (remoteBranches.includes(targetBranch)) {
            console.log(chalk.green(`   ✓ Found "${targetBranch}" on remote.`));
            const trackRemote = await promptYesNo(chalk.yellow(`   Create local branch tracking origin/${targetBranch}? (y/N): `));
            if (trackRemote) {
              try {
                const { stdout: out } = await execAsync(`git checkout -b ${targetBranch} origin/${targetBranch}`);
                if (out) console.log(chalk.gray(out.trim()));
                printSuccess(`Switched to new branch '${targetBranch}' tracking remote.`);
                addLedgerEntry({ description: query, command: `git checkout -b ${targetBranch} origin/${targetBranch}`, status: 'success' });
                process.exit(0);
              } catch (e2) {
                printError('Failed to track remote branch.');
                if (e2 instanceof Error) console.log(chalk.gray('   ' + e2.message));
              }
            }
          } else {
            // Offer to create a new branch
            const localBranches = await listLocalBranches();
            console.log(chalk.gray(`   Local branches: ${localBranches.join(', ')}\n`));
            const createNew = await promptYesNo(chalk.yellow(`   Create new branch "${targetBranch}"? (y/N): `));
            if (createNew) {
              try {
                const { stdout: out } = await execAsync(`git checkout -b ${targetBranch}`);
                if (out) console.log(chalk.gray(out.trim()));
                printSuccess(`Created and switched to new branch '${targetBranch}'.`);
                addLedgerEntry({ description: query, command: `git checkout -b ${targetBranch}`, status: 'success' });
                process.exit(0);
              } catch (e2) {
                printError('Failed to create branch.');
                if (e2 instanceof Error) console.log(chalk.gray('   ' + e2.message));
              }
            }
          }
        }
      }

      printError(MESSAGES.failed);
      if (error instanceof Error) {
        console.log(chalk.gray('   ' + error.message));
      }
      
      // Log failure to ledger
      addLedgerEntry({
        description: query,
        command,
        status: 'failed',
        reversalCommand: undefined,
      });
    }
  } catch (error) {
    // Global error handler
    printError('An unexpected error occurred');
    if (error instanceof Error) {
      console.log(chalk.gray('   ' + error.message));
      if (process.env.DEBUG) {
        console.log(chalk.gray('\nStack trace:'));
        console.log(chalk.gray(error.stack));
      }
    }
    console.log(chalk.yellow('\n💡 If this persists, please report it as an issue'));
    process.exit(1);
  }
  });

// Add 'history' command
program
  .command('history')
  .description('View command execution history')
  .option('-n, --number <count>', 'Number of entries to show', '10')
  .action(async (options) => {
    const ledger = getLedger();
    
    if (ledger.length === 0) {
      console.log(chalk.yellow('No command history yet'));
      return;
    }

    const count = Math.min(parseInt(options.number), ledger.length);
    const entries = ledger.slice(-count).reverse();

    console.log(chalk.bold.cyan(`\n📜 Last ${count} Commands:\n`));
    
    entries.forEach((entry, index) => {
      const statusIcon = entry.status === 'success' ? chalk.green('✓') : chalk.red('✗');
      const time = new Date(entry.timestamp).toLocaleString();
      
      console.log(chalk.gray(`${count - index}. ${time}`));
      console.log(`   ${statusIcon} ${chalk.cyan(entry.command)}`);
      console.log(chalk.gray(`   "${entry.description}"\n`));
    });
  });

// Add 'undo' command
program
  .command('undo')
  .description('Undo the last Git operation')
  .action(async () => {
    const lastCommand = getLastCommand();
    
    if (!lastCommand) {
      printWarning('No commands to undo');
      return;
    }

    if (lastCommand.status === 'failed') {
      printWarning('Last command failed, nothing to undo');
      return;
    }

    console.log(chalk.bold.yellow('\n⚠️  Undo Last Operation\n'));
    console.log(chalk.gray('Last command:'));
    printCommand(lastCommand.command);
    console.log(chalk.gray(`Description: "${lastCommand.description}"\n`));

    // Suggest reversal based on command type
    let reversalCommand = '';
    
    if (lastCommand.command.includes('git commit')) {
      reversalCommand = 'git reset --soft HEAD~1';
      console.log(chalk.yellow('💡 This will undo the commit but keep your changes'));
    } else if (lastCommand.command.includes('git add')) {
      reversalCommand = 'git reset HEAD';
      console.log(chalk.yellow('💡 This will unstage the files'));
    } else if (lastCommand.command.includes('git push')) {
      printError('Cannot automatically undo a push. Use git revert or contact your team.');
      return;
    } else if (lastCommand.reversalCommand) {
      reversalCommand = lastCommand.reversalCommand;
    } else {
      printWarning('No automatic undo available for this command');
      console.log(chalk.gray('💡 Check git reflog for manual recovery'));
      return;
    }

    const shouldUndo = await promptYesNo(chalk.yellow(`\nRun: ${reversalCommand}? (y/N): `));
    if (!shouldUndo) {
      console.log(chalk.gray('Cancelled'));
      return;
    }

    try {
      const { stdout, stderr } = await execAsync(reversalCommand);
      if (stdout) console.log(chalk.gray(stdout.trim()));
      if (stderr) console.log(chalk.yellow(stderr.trim()));
      printSuccess('Undo completed');
      
      // Log the undo operation
      addLedgerEntry({
        description: `Undo: ${lastCommand.description}`,
        command: reversalCommand,
        status: 'success',
      });
    } catch (error) {
      printError('Undo failed');
      if (error instanceof Error) {
        console.log(chalk.gray('   ' + error.message));
      }
    }
  });

//'status' command
// Add a 'status' command
program
  .command('status')
  .description('Show detailed Git repository status')
  .action(async () => {
    console.log(chalk.blue('Checking repository...\n'));
    
    // Check if Git repo
    const isRepo = await isGitRepository();
    if (!isRepo) {
      console.log(chalk.red('Not a Git repository'));
      process.exit(1);
    }

    console.log(chalk.green('This is a Git repository\n'));

    try {
      // Get branch
      console.log(chalk.gray('Getting current branch...'));
      const branch = await getCurrentBranch();
      console.log(chalk.green('📍 Current branch:'), chalk.bold(branch));

      // Get status
      console.log(chalk.gray('\nGetting repository status...'));
      const status = await getRepoStatus();
      
      console.log(chalk.blue('\n📊 Repository Status:'));
      console.log(chalk.gray('  Modified:'), status.modified.length);
      console.log(chalk.gray('  Staged:'), status.staged.length);
      console.log(chalk.gray('  Untracked:'), status.not_added.length);
      
      if (status.modified.length > 0) {
        console.log(chalk.yellow('\n  Modified files:'));
        status.modified.forEach(file => {
          console.log(chalk.gray(`    - ${file}`));
        });
      }
      
    } catch (error) {
      console.log(chalk.red('\n Error getting Git information'));
      if (error instanceof Error) {
        console.log(chalk.gray('   ' + error.message));
        console.log(chalk.gray('\n   Stack trace:'));
        console.log(chalk.gray('   ' + error.stack));
      }
    }
  });

program.parse();