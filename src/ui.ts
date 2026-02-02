import chalk from 'chalk';

/**
 * UI utilities for beautiful terminal output
 */

export function printHeader(text: string): void {
  console.log(chalk.bold.cyan(`\n${'═'.repeat(60)}`));
  console.log(chalk.bold.cyan(`  ${text}`));
  console.log(chalk.bold.cyan(`${'═'.repeat(60)}\n`));
}

export function printSection(title: string): void {
  console.log(chalk.bold.blue(`\n▶ ${title}`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`));
}

export function printError(message: string): void {
  console.log(chalk.red(`${message}`));
}

export function printWarning(message: string): void {
  console.log(chalk.yellow(`⚠️  ${message}`));
}

export function printInfo(message: string): void {
  console.log(chalk.blue(`ℹ️  ${message}`));
}

export function printCommand(command: string): void {
  console.log(chalk.bold.cyan(`  $ ${command}`));
}

export function printBox(title: string, content: string[]): void {
  const maxLength = Math.max(title.length, ...content.map(c => c.length));
  const width = Math.min(maxLength + 4, 60);
  
  console.log(chalk.gray(`┌${'─'.repeat(width)}┐`));
  console.log(chalk.gray('│ ') + chalk.bold(title.padEnd(width - 1)) + chalk.gray('│'));
  console.log(chalk.gray(`├${'─'.repeat(width)}┤`));
  content.forEach(line => {
    console.log(chalk.gray('│ ') + line.padEnd(width - 1) + chalk.gray('│'));
  });
  console.log(chalk.gray(`└${'─'.repeat(width)}┘`));
}

export function printDivider(): void {
  console.log(chalk.gray(`${'─'.repeat(60)}`));
}

export function printRiskBadge(level: 'safe' | 'warning' | 'dangerous'): string {
  switch (level) {
    case 'safe':
      return chalk.bgGreen.black(' SAFE ');
    case 'warning':
      return chalk.bgYellow.black(' WARNING ');
    case 'dangerous':
      return chalk.bgRed.white(' DANGEROUS ');
  }
}

export function spinnerFrames(): string[] {
  return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
}

export class Spinner {
  private frames = spinnerFrames();
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${chalk.blue(this.frames[this.currentFrame])} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r\x1b[K'); // Clear line
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
}
