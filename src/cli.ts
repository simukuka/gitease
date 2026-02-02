#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { isGitRepository, getCurrentBranch, getRepoStatus } from './git.js';

const program = new Command();

program
  .name('gitease')
  .description('Git commands in plain English using AI')
  .version('0.1.0');

program
  .argument('[query]', 'What you want to do in plain English')
  .action(async (query?: string) => {
    // Validate input
    if (!query || query.trim().length === 0) {
      console.log(chalk.red('Error: Please provide a valid query'));
      console.log(chalk.yellow('\nExample:'));
      console.log(chalk.gray('  gitease "undo my last commit"'));
      process.exit(1);
    }

    // Check if in a Git repository
    console.log(chalk.blue('Checking Git repository...'));
    
    const isRepo = await isGitRepository();
    
    if (!isRepo) {
      console.log(chalk.red('\nError: Not a Git repository'));
      console.log(chalk.yellow('\n💡 Tip: Navigate to a Git repository first'));
      process.exit(1);
    }

    // Get current branch
    try {
      const branch = await getCurrentBranch();
      console.log(chalk.green(`Git repository detected (branch: ${branch})`));
    } catch (error) {
      console.log(chalk.yellow('Git repository detected (branch unknown)'));
    }

    // Show what user asked
    console.log(chalk.blue('\n You asked:'), chalk.bold(query));
    console.log(chalk.gray('  (Next: We\'ll send this to Copilot!)'));
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
      console.log(chalk.red('\n❌ Error getting Git information'));
      if (error instanceof Error) {
        console.log(chalk.gray('   ' + error.message));
        console.log(chalk.gray('\n   Stack trace:'));
        console.log(chalk.gray('   ' + error.stack));
      }
    }
  });

program.parse();