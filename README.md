# unirepo

[![npm version](https://img.shields.io/npm/v/unirepo-cli)](https://www.npmjs.com/package/unirepo-cli)
[![CI](https://github.com/Poko18/unirepo/actions/workflows/ci.yml/badge.svg)](https://github.com/Poko18/unirepo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**The workspace for cross-repo coding.**

unirepo turns a set of GitHub repos into a single unified workspace. Edit code across any of them, commit once, and push updates back to their original repos — all in one branch.

Built for the era of AI coding agents: give your agent one place to work, and let it refactor, ship features, and update shared APIs across your entire stack.


## Why unirepo?

**Before unirepo:**

```
~/work/api        ← clone, checkout branch, edit
~/work/web        ← clone, checkout same branch, edit
~/work/shared     ← clone, checkout same branch, edit
# remember to push all three, open three PRs
```

**With unirepo:**

```
~/work/my-workspace/
├── api/      ← edit
├── web/      ← edit
└── shared/   ← edit
# one commit, one push — all three repos updated
```


## Quick Start

```bash
npx unirepo-cli init my-workspace \
  https://github.com/org/api.git \
  https://github.com/org/web.git
```

This creates:

```
my-workspace/
├── api/          ← from github.com/org/api
├── web/          ← from github.com/org/web
├── AGENTS.md     ← workflow guide for humans and agents
└── .gitignore
```

Then work across repos as if they were one:

```bash
cd my-workspace
# edit files in api/ and web/
git add . && git commit -m "feat: update shared types"
unirepo push
```

That's it. Each subtree gets pushed to its upstream repo automatically.


## Install

```bash
npm install -g unirepo-cli
```

Once installed, the command is just `unirepo`:

```bash
unirepo --version
```

Or use without installing:

```bash
npx unirepo-cli <command>
```


## Commands

| Command | Description |
| --- | --- |
| `init <dir> <repo...>` | Create a new workspace from one or more repos |
| `add <repo>` | Add another repo to the workspace |
| `pull [subtree...]` | Pull upstream changes into tracked subtrees |
| `status` | Show subtrees, branches, and what changed |
| `branch [name]` | Create or show the current push branch |
| `push [subtree...]` | Push changed subtrees upstream |
| `version` | Show CLI version |


## Workflow

A typical session looks like this:

```bash
# 1. Create a branch for your work
unirepo branch feature-auth

# 2. Pull latest upstream changes
unirepo pull

# 3. Edit files across repos
vim api/src/auth.js web/src/login.tsx

# 4. Commit in the monorepo
git add . && git commit -m "feat: add OAuth flow"

# 5. Check what will be pushed
unirepo status
unirepo push --dry-run

# 6. Push to upstream repos
unirepo push

# 7. Open one PR per upstream repo
```

The branch name you create in the workspace is reused when pushing to each upstream repo.


## Command Reference

### init

```bash
unirepo init <dir> <repo-url> [repo-url...]
```

Creates a new git repo at `<dir>`, imports each URL as a subtree, and generates an `AGENTS.md` workflow guide.

| Flag | Effect |
| --- | --- |
| `--full-history` | Import full git history (default: squash) |

### add

```bash
unirepo add <repo-url> [--prefix <name>] [--branch <name>]
```

Adds a repo to an existing workspace. The directory name defaults to the repo name.

| Flag | Effect |
| --- | --- |
| `--prefix <name>` | Override the subtree directory name |
| `--branch <name>` | Import from a specific upstream branch |
| `--full-history` | Import full git history |

### pull

```bash
unirepo pull [subtree...]
```

Pulls upstream changes. Without arguments, pulls all tracked subtrees.

| Flag | Effect |
| --- | --- |
| `--branch <name>` | Pull a specific upstream branch |
| `--full-history` | Pull full history instead of squash |

### status

```bash
unirepo status [--json]
```

Shows tracked subtrees, their upstream branches, the current push branch, and which subtrees have changes.

### branch

```bash
unirepo branch [name]
```

With a name: creates and switches to a new branch. Without: shows the current branch and push targets.

### push

```bash
unirepo push [subtree...] [--dry-run]
```

Pushes changed subtrees upstream. Without arguments, auto-detects which subtrees have changes.

| Flag | Effect |
| --- | --- |
| `--branch <name>` | Override the upstream branch name |
| `--dry-run` | Show what would run without executing |


## How It Works

unirepo is a thin wrapper around [`git subtree`](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging#_subtree_merge). Each repo you add becomes a directory in your workspace with a matching git remote. When you push, unirepo splits your commits per subtree and pushes each to its upstream.

There's no lock-in — the workspace is a standard git repo. You can always fall back to raw `git subtree` commands.


## Development

```bash
npm test        # run tests
npm run build   # syntax check
```


## License

MIT — see [LICENSE](LICENSE).
