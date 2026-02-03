# 🪄 GitEase

> Git commands in plain English, powered by AI

Transform complex Git operations into simple conversations. GitEase uses GitHub Copilot to translate your intentions into the right Git commands—no more Googling syntax or memorizing flags.

[![npm version](https://img.shields.io/npm/v/gitease-cli.svg)](https://www.npmjs.com/package/gitease-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Copilot CLI Challenge](https://img.shields.io/badge/GitHub-Copilot%20Challenge-blue)](https://dev.to/challenges/github-2026-01-21)

---

## ✨ Features

- 🤖 **AI-Powered**: Leverages GitHub Copilot CLI for intelligent command suggestions
- 🎯 **Natural Language**: Describe what you want in plain English—no syntax required
- 🛡️ **Safety-First**: Preview commands and see warnings before execution
- 📊 **Smart Context**: Shows diffs, status, and logs for dangerous operations
- ⏮️ **Undo History**: Track every action and reverse mistakes
- 🎨 **Beautiful UI**: Clean, colored terminal output with progress indicators
- 📚 **Educational**: Learn Git commands while you work

---

## 🤔 Why GitEase?

**Before GitEase:**
```bash
# You forget the exact command
$ git ???

# Google "how to undo last commit keep changes"
# Read Stack Overflow
# Copy-paste command
# Cross your fingers 🤞
```

**With GitEase:**
```bash
$ gitease "undo my last commit but keep the changes"

# Get the right command instantly
# See exactly what will happen
# Execute with confidence ✨
```

---

## 🎬 Demo
```bash
$ gitease "undo my last commit but keep the changes"

🔍 Checking Git repository...
✅ Git repository detected (branch: main)

🤖 Checking GitHub Copilot...
✅ GitHub Copilot available

💭 Asking Copilot for suggestions...

✨ Copilot suggests:

  git reset --soft HEAD~1

  This will undo your last commit while keeping changes staged

⚠️  DANGER: This command can modify commit history
📋 Preview: Last commit will be: "feat: add user authentication"

Execute this command? (y/N):
```

---

## 📦 Installation

### Prerequisites

Before installing GitEase, you'll need:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **GitHub CLI** - Install with:
```bash
  # macOS
  brew install gh
  
  # Windows
  winget install GitHub.cli
  
  # Linux
  sudo apt install gh
  
  # Or download from: https://cli.github.com/
```
- **GitHub Copilot subscription** - [Sign up here](https://github.com/features/copilot)
  - ✅ Free for students/teachers
  - ✅ Free trial available
  - 💰 $10/month for individuals

### Installation Steps

**1. Install the CLI:**
```bash
npm install -g gitease-cli
```

**2. Authenticate with GitHub:**
```bash
gh auth login
# Follow the prompts to authenticate
```

**3. Enable GitHub Copilot CLI extension:**
```bash
# On newer GitHub CLI versions, copilot is built-in
# On first use, it will auto-download the Copilot CLI (takes ~30 seconds)
gh copilot --help  # Verify it works
```

**Note:** The first time you use `gh copilot`, it downloads the Copilot CLI automatically. This may take 30-60 seconds. Subsequent calls will be faster.

**4. Verify GitEase works:**
```bash
cd /path/to/your/git/repo
gitease "show recent commits"
```

---

## ⚠️ Troubleshooting

### GitEase command not found
```bash
# Make sure npm global bin is in PATH
npm config get prefix
# Add ~/.npm-global/bin to your PATH if needed
```

### "Copilot request timed out"
- Make sure `gh copilot` CLI is installed:
  ```bash
  gh copilot --help
  ```
- If it's not working, reinstall:
  ```bash
  gh extension remove github/gh-copilot
  gh extension install github/gh-copilot
  ```

### "GitHub Copilot not available"
You need an active GitHub Copilot subscription to use GitEase:
- ✅ **Free** for students and teachers
- ✅ **Free trial** (2 months)
- 💰 **$10/month** for individuals
- Sign up at [github.com/features/copilot](https://github.com/features/copilot)

---

## 🚀 Quick Start
```bash
# 1. Install GitEase globally
npm install -g gitease-cli

# 2. Authenticate with GitHub (one-time)
gh auth login

# 3. Install Copilot extension and verify
gh extension install github/gh-copilot
gh copilot --prompt "Return just: test"

# 4. Start using it!
gitease "create a new branch called feature-login"
```

---

## 🚀 Usage

### Natural Language Queries

GitEase understands plain English descriptions of what you want to do:
```bash
# Undo operations
gitease "undo my last commit"
gitease "undo last 3 commits but keep changes"
gitease "undo the commit before last"

# Branch operations  
gitease "create a new branch called feature-auth"
gitease "switch to main and pull latest"
gitease "delete the feature-test branch"

# Viewing history
gitease "show me what changed in the last commit"
gitease "show commit history for the past week"
gitease "who changed this file last"

# Staging and commits
gitease "stage all JavaScript files"
gitease "commit everything with message 'Fix authentication bug'"
gitease "unstage all files"

# Advanced operations
gitease "cherry pick commit abc123"
gitease "interactive rebase last 5 commits"
gitease "squash last 3 commits"
```

### Built-in Commands
```bash
# Check detailed repository status
gitease status

# View command history
gitease history

# Undo last executed command
gitease undo

# Get help
gitease --help
gitease --version
```

---

## 🎯 How It Works
```
┌─────────────────────────────────┐
│  You type plain English         │
│  "undo my last commit"          │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  GitEase validates:             │
│  ✓ Git repository exists        │
│  ✓ GitHub Copilot available     │
│  ✓ Repository has commits       │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  GitHub Copilot analyzes        │
│  Suggests best Git command      │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  GitEase safety check:          │
│  • Analyzes risk level          │
│  • Shows preview/diff           │
│  • Warns about dangers          │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  You confirm (Y/n)              │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  Command executes               │
│  Action saved to history        │
│  Success confirmation shown     │
└─────────────────────────────────┘
```

---

## 🛡️ Safety Model

GitEase categorizes commands by risk level:

### 🟢 **Safe** (Auto-execute or minimal confirmation)
- Read-only operations: `git status`, `git log`, `git diff`
- Simple staging: `git add`
- Branch viewing: `git branch --list`

### 🟡 **Warning** (Show preview + confirmation)
- Merges: `git merge`
- Rebases: `git rebase`
- Pushes: `git push`
- Commits: `git commit`

### 🔴 **Dangerous** (Show detailed preview + strong warning)
- Hard resets: `git reset --hard`
- Force pushes: `git push --force`
- Destructive cleanups: `git clean -fd`
- Branch deletions: `git branch -D`

**Dangerous commands show:**
- ⚠️ Clear warning message
- 📋 Preview of what will be affected (diffs, files, commits)
- ❓ Strong confirmation prompt

---

## ⏮️ Undo History

GitEase tracks every command you execute in `~/.gitease-ledger.json`.
```bash
# View your command history
gitease history
```

**Example output:**
```
Recent GitEase Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git commit -m "Add authentication"
   📁 /Users/you/projects/my-app
   🕐 2 minutes ago

2. git add src/auth.ts
   📁 /Users/you/projects/my-app  
   🕐 5 minutes ago

3. git checkout -b feature-auth
   📁 /Users/you/projects/my-app
   🕐 10 minutes ago
```

### Undo Last Action
```bash
gitease undo
```

**Reversible operations:**
- `git commit` → `git reset --soft HEAD~1`
- `git add <files>` → `git reset HEAD <files>`
- `git checkout -b <branch>` → `git checkout -` + `git branch -d <branch>`
- `git merge` → `git merge --abort` (if in progress)

**Non-reversible operations:**
- `git push` (changes are on remote)
- `git reset --hard` (data lost)
- Destructive operations

GitEase will warn you if an operation cannot be undone.

---

## 🛠️ Development

Want to contribute or customize GitEase? Here's how to get started.

### Clone & Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/gitease.git
cd gitease

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link locally for testing
npm link
```

Now you can use `gitease` globally on your machine with your local changes.

### Development Commands
```bash
# Build once
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Run locally without installing
node dist/cli.js "your query"

# Debug mode (verbose logging)
DEBUG=1 gitease "your query"
```

### Adding New Features

**Example: Add a new safety check**

1. Update `src/safety.ts`:
```typescript
export function isDestructive(command: string): boolean {
  const destructivePatterns = [
    /git\s+reset\s+--hard/,
    /git\s+clean\s+-[fd]/,
    // Add your pattern
  ];
  return destructivePatterns.some(p => p.test(command));
}
```

2. Rebuild and test:
```bash
npm run build
gitease "your test query"
```

---

## 🧪 Testing
```bash
# Test in a safe repository
cd /tmp
git init test-repo
cd test-repo
git commit --allow-empty -m "Initial commit"

# Test GitEase commands
gitease "undo my last commit"
gitease status
gitease history
```

### Debug Mode

Enable verbose logging to see what's happening:
```bash
DEBUG=1 gitease "your query"
```

**Debug output shows:**
- Raw Copilot responses
- Parsed commands
- Risk analysis results
- Git command outputs

---

## 🆘 Troubleshooting

### "gh: command not found"
**Solution:** Install GitHub CLI from https://cli.github.com/

### "This action requires authentication"
**Solution:** Run `gh auth login` to authenticate with GitHub

### "Copilot not available" or "model not enabled"
**Solution:** 
- Make sure you have a Copilot subscription
- Try: `gh copilot --help` to verify it works
- Some users may need: `gh copilot --model claude-sonnet-4.5` once

### "Not a Git repository"
**Solution:** Navigate to a Git repository first:
```bash
cd ~/projects/my-app
gitease "your query"
```

### "gitease: command not found"
**Solution:** The npm global install didn't add to PATH. Try:
```bash
npm install -g gitease --force
```

Or check your npm global bin path:
```bash
npm config get prefix
# Add this path to your $PATH environment variable
```

### Commands not parsing correctly
**Solution:** Run in debug mode to see what's happening:
```bash
DEBUG=1 gitease "your query"
```

Send the output when reporting issues.

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
```bash
   git checkout -b feature/amazing-feature
```
3. **Make your changes**
   - Write clear, commented code
   - Follow existing code style
   - Add tests if applicable
4. **Commit your changes**
```bash
   git commit -m "feat: add amazing feature"
```
5. **Push to your fork**
```bash
   git push origin feature/amazing-feature
```
6. **Open a Pull Request**

### Development Guidelines

- Use TypeScript types for all functions
- Add JSDoc comments for public functions
- Keep functions small and focused
- Handle errors gracefully
- Test with various Git scenarios

### Ideas for Contributions

- 🌍 Multi-language support
- 🎨 Custom themes/color schemes
- 📦 Additional safety checks
- 🔌 Plugin system for custom commands
- 📖 More comprehensive documentation
- 🧪 Automated testing suite

---

## 📝 License

MIT © [Your Name]

See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Built for:** [GitHub Copilot CLI Challenge](https://dev.to/challenges/github-2026-01-21)
- **Powered by:** [GitHub Copilot](https://github.com/features/copilot)
- **Built with:**
  - [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
  - [Commander.js](https://github.com/tj/commander.js/) - CLI framework
  - [Chalk](https://github.com/chalk/chalk) - Terminal styling
  - [simple-git](https://github.com/steveukx/git-js) - Git operations

---

## 🔗 Links

- **Documentation:** [Full documentation](https://github.com/simukuka/gitease/wiki)
- **Issues:** [Report a bug](https://github.com/simukuka/gitease/issues)
- **Discussions:** [Ask a question](https://github.com/simukuka/gitease/discussions)
- **Changelog:** [See what's new](https://github.com/simukuka/gitease/releases)

---

## 💬 Feedback & Support

Found a bug or have a suggestion?  
[Open an issue](https://github.com/simukuka/gitease/issues) and let's make GitEase better together!

---

<div align="center">


⭐ Star this repo if GitEase helps you!

[Report Bug](https://github.com/yourusername/gitease/issues) · [Request Feature](https://github.com/yourusername/gitease/issues) · [Contribute](https://github.com/yourusername/gitease/pulls)

</div>