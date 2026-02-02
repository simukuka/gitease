#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isGitRepository, getCurrentBranch, getRepoStatus, hasCommits } from './git.js';
import { getCopilotSuggestion, isCopilotAvailable } from './copilot.js';
import { analyzeCommand, isReversible } from './safety.js';
import { addLedgerEntry } from './ledger.js';
import { MESSAGES } from './constants.js';
import { RiskLevel } from './types.js';

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
    console.log(chalk.blue(MESSAGES.checking));
    const copilotAvailable = await isCopilotAvailable();
    
    if (!copilotAvailable) {
      console.log(chalk.red(`\n❌ ${MESSAGES.copilotUnavailable}`));
      console.log(chalk.yellow(`\n💡 ${MESSAGES.copilotLoginTip}`));
      process.exit(1);
    }
    
    console.log(chalk.green(`✅ ${MESSAGES.available}\n`));

    // Get suggestion from Copilot
    let suggestion;
    try {
      suggestion = await getCopilotSuggestion(query);
    } catch (error) {
      console.log(chalk.red('\n Failed to get suggestion from Copilot'));
      if (error instanceof Error) {
        console.log(chalk.gray('   ' + error.message));
      }
      return;
    }

    console.log(chalk.green('\n✨ Copilot suggests:\n'));
    console.log(chalk.bold.cyan('  ' + suggestion.command));
    console.log(chalk.gray('\n  ' + suggestion.explanation));

    if (!suggestion.command || suggestion.command === 'No command suggested' || !suggestion.command.trim().startsWith('git ')) {
      console.log(chalk.red(MESSAGES.noCommand));
      return;
    }

    let command = suggestion.command.trim();

    // Analyze command safety
    const safety = analyzeCommand(command);
    if (safety.riskLevel !== RiskLevel.Safe) {
      console.log(chalk.yellow(`\n${safety.message}`));
      if (!isReversible(command)) {
        const proceed = await promptYesNo(chalk.red('This operation cannot be undone. Proceed? (y/N): '));
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
        console.log(stdout.trim());
      }
      if (stderr) {
        console.log(chalk.yellow(stderr.trim()));
      }
      console.log(chalk.green(`\n✅ ${MESSAGES.done}`));
      
      // Log to ledger
      addLedgerEntry({
        description: query,
        command,
        status: 'success',
        reversalCommand: isReversible(command) ? 'git reflog' : undefined,
      });
    } catch (error) {
      console.log(chalk.red(`\n❌ ${MESSAGES.failed}`));
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