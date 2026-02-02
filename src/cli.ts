#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isGitRepository, getCurrentBranch, getRepoStatus, hasCommits } from './git.js';
import { getCopilotSuggestion, isCopilotAvailable } from './copilot.js';
import { analyzeCommand, isReversible } from './safety.js';
import { addLedgerEntry, getLedger, getLastCommand } from './ledger.js';
import { MESSAGES } from './constants.js';
import { RiskLevel, CopilotSuggestion } from './types.js';
import { printSuccess, printError, printWarning, printCommand, printRiskBadge, Spinner } from './ui.js';

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
        console.log(chalk.yellow(`\n💡 ${MESSAGES.copilotLoginTip}`));
        process.exit(1);
      }
      
      printSuccess(MESSAGES.available);

    // Get suggestion from Copilot
    let suggestion: CopilotSuggestion;
    try {
      const spinner = new Spinner('Asking Copilot for suggestions...');
      spinner.start();
      suggestion = await getCopilotSuggestion(query);
      spinner.stop();
    } catch (error) {
      printError('Failed to get suggestion from Copilot');
      if (error instanceof Error) {
        console.log(chalk.gray('   ' + error.message));
      }
      return;
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
    } catch (error) {
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