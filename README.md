Gitease
=======

A safety‑first natural language Git copilot for the command line. Describe what you want to do in plain English and Gitease suggests the Git command, explains it, and asks for confirmation before running it.

Highlights
----------
- **Natural language → Git commands** via GitHub Copilot CLI
- **Safety confirmations** with risk warnings
- **Undo history** to review and reverse recent actions
- **Polished terminal UI** with clear, readable output

Requirements
------------
- **Node.js 18+**
- **Git**
- **GitHub CLI** (`gh`) with **Copilot CLI** enabled

Quick Start
-----------
1) Install dependencies

	- `npm install`

2) Build

	- `npm run build`

3) Run

	- `node dist/cli.js "undo my last commit"`

Or link the CLI globally (optional):

- `npm link`
- `gitease "show me the repo status"`

GitHub Copilot CLI Setup
------------------------
Make sure the Copilot CLI is available and authenticated:

- `gh auth login`
- `gh copilot --help`

If you see an error about models (e.g., `claude-sonnet-4.5`), run Copilot once in interactive mode to enable the model:

- `gh copilot --model claude-sonnet-4.5`

Usage
-----
### Natural Language Queries
```text
gitease "undo my last commit"
gitease "show me the repo status"
gitease "create a new branch called feature/login"
gitease "commit all changes"
```

### Built‑in Commands
```text
gitease status
gitease history
gitease undo
```

What Happens When You Run a Query
---------------------------------
1) Gitease checks you are inside a Git repo.
2) It asks Copilot for a **single, simple Git command**.
3) It shows the command and a short explanation.
4) It analyzes the risk and warns if needed.
5) It asks for confirmation before executing.
6) It logs the result to the undo ledger.

Safety Model
------------
Commands are grouped into:

- **Safe**: typically read‑only or low‑risk
- **Warning**: pushes, merges, rebases
- **Dangerous**: hard resets, force pushes, aggressive cleanups

Dangerous commands require explicit confirmation. Some operations are flagged as **not automatically reversible**.

Undo History
------------
Gitease records executed commands in a local ledger. You can:

- View history: `gitease history`
- Undo last operation: `gitease undo`

Undo is best‑effort. For example:
- `git commit` → `git reset --soft HEAD~1`
- `git add` → `git reset HEAD`
- `git push` → **not automatically reversible**

Error Handling
--------------
Gitease provides safe, readable error messages. For deeper diagnostics:

- `DEBUG=1 gitease "your request"`

Project Structure
-----------------
```
src/
  cli.ts         # CLI entry and flow
  copilot.ts     # GitHub Copilot CLI integration
  git.ts         # Git helpers
  safety.ts      # Risk analysis
  ledger.ts      # Undo history
  ui.ts          # Terminal UI helpers
  constants.ts   # Strings, prompts, patterns
  types.ts       # Shared types
```

Development
-----------
- `npm run dev` → watch mode
- `npm run build` → compile to `dist/`
- `npm start` → run compiled CLI

Notes
-----
- Copilot responses may take a few seconds (network + model latency).
- Copilot output is constrained to a **single simple Git command**.

Roadmap Ideas
-------------
- Better command parsing and validation
- More undo mappings
- Test suite for safety rules
- Configurable risk thresholds

License
-------
MIT
