# 🪄 GitEase

> Git commands in plain English, powered by AI

Transform complex Git operations into simple conversations. GitEase uses GitHub Copilot CLI to translate your intent into the right Git command, shows a safety preview, and asks for confirmation before running anything.

[![npm version](https://img.shields.io/npm/v/gitease.svg)](https://www.npmjs.com/package/gitease)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🤖 **AI‑Powered**: Uses GitHub Copilot CLI for command suggestions
- 🎯 **Natural Language**: Describe what you want in plain English
- 🛡️ **Safety‑First**: Risk analysis + confirmation before execution
- 🔍 **Diff Preview**: Shows relevant diffs/status for risky commands
- 🧾 **Undo History**: Track actions and undo the last operation
- 🎨 **Polished UI**: Clean, readable terminal output with badges/spinners

## 🎬 Demo
```bash
$ gitease "undo my last commit but keep the changes"

Git repository detected (branch: main)
✅ GitHub Copilot available

✨ Copilot suggests:
  $ git reset --soft HEAD~1

⚠️  This command can irreversibly delete or modify commits/files
Preview:
(diff/status preview)

Run this command? (y/N):
```

## 📦 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [GitHub CLI](https://cli.github.com/) (`gh`)
- GitHub Copilot subscription

### Install GitEase
```bash
npm install -g gitease
```

### Setup GitHub Copilot
```bash
gh auth login
gh copilot --help
```

If you see a model‑enable error (e.g., `claude-sonnet-4.5`), enable it once:
```bash
gh copilot --model claude-sonnet-4.5
```

## 🚀 Usage

### Natural Language
```bash
gitease "undo my last commit"
gitease "show me the repo status"
gitease "create a branch called feature/login"
gitease "commit all changes"
```

### Built‑in Commands
```bash
gitease status
gitease history
gitease undo
```

## 🎯 How It Works
```
You type intent → GitEase validates repo → Copilot suggests a command
→ GitEase previews + warns → you confirm → command executes → ledger updates
```

## 🛡️ Safety Model

Commands are grouped into:

- **Safe**: read‑only or low‑risk
- **Warning**: merges, rebases, pushes
- **Dangerous**: hard resets, force pushes, aggressive cleanups

Risky commands show a preview (diff/status/log) before confirmation.

## 🧾 Undo History

Gitease stores executed commands in `~/.gitease-ledger.json`.

- `gitease history` → list recent commands
- `gitease undo` → reverse the last action when possible

Examples:
- `git commit` → `git reset --soft HEAD~1`
- `git add` → `git reset HEAD`
- `git push` → not automatically reversible

## 🛠️ Development

```bash
npm install
npm run build
npm run dev
```

### Project Structure
```
src/
  cli.ts         # CLI flow and prompts
  copilot.ts     # GitHub Copilot CLI integration
  git.ts         # Git helpers
  safety.ts      # Risk analysis
  ledger.ts      # Undo history
  ui.ts          # Terminal UI helpers
  constants.ts   # Strings, prompts, patterns
  types.ts       # Shared types
```

## 🧪 Debugging

```bash
DEBUG=1 gitease "your request"
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a PR

## 📝 License

MIT
