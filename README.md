# unirepo

[![npm version](https://img.shields.io/npm/v/unirepo-cli)](https://www.npmjs.com/package/unirepo-cli)
[![CI](https://github.com/Poko18/unirepo/actions/workflows/ci.yml/badge.svg)](https://github.com/Poko18/unirepo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

### One workspace to refactor your whole stack in one go

Work across multiple repos like they’re one. Unirepo turns multiple GitHub repositories into a single unified workspace. Edit backend, frontend, and shared code in one tree, commit from one place, and push changes back to each repo using the same branch.

### Built for AI coding agents

AI agents need full context to make correct changes—not one repo at a time. Unirepo gives them a single workspace to refactor your entire stack, keep changes consistent, and push updates back to each repo.

### Example task

You need to update:

- `api/` for a new endpoint
- `web/` for the UI
- `shared/` for shared types

<table>
<tr>
<td width="50%" valign="top">

**Without `unirepo`**

```bash
# clone and branch in each repo
git clone git@github.com:org/api.git
git clone git@github.com:org/web.git
git clone git@github.com:org/shared.git

cd api
git checkout -b feature-auth
cd ../web
git checkout -b feature-auth
cd ../shared
git checkout -b feature-auth

# edit in 3 separate checkouts

# commit in each repo
cd ../api
git add .
git commit -m "feat: add auth"
cd ../web
git add .
git commit -m "feat: add auth UI"
cd ../shared
git add .
git commit -m "feat: add auth types"

# push from each repo
cd ../api
git push -u origin feature-auth
cd ../web
git push -u origin feature-auth
cd ../shared
git push -u origin feature-auth
```

</td>
<td width="50%" valign="top">

**With `unirepo`**

```bash
# create one workspace and one branch
unirepo init my-workspace <repo...>
cd my-workspace
unirepo branch feature-auth

# edit api/, web/, and shared/ together

# commit once from the workspace
git add .
git commit -m "feat: add auth flow"

# push changed subtrees
unirepo push
```

</td>
</tr>
</table>

## Same workflow, fewer commands

`unirepo` keeps your upstream repos separate while removing:

- Repo and branch juggling  
- Repeated setup and commands  
- Context switching  
- Inconsistent cross-repo changes  

It enables:

- One place to see the full change  
- Safe cross-repo refactors  
- A single workspace for humans and AI


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


## Why it works well for agents

AI coding agents work best when they can see the full change at once.

- Update backend, frontend, and shared contracts in one pass
- Commit coordinated changes from one repo
- Check affected subtrees with `unirepo status`
- Push only changed subtrees with `unirepo push`
- Reuse the generated `AGENTS.md` workflow guide


## Commands

| Command | Description |
| --- | --- |
| `init <dir> <repo...>` | Create a new workspace from one or more repos |
| `add <repo>` | Add another repo to the workspace |
| `pull [subtree...]` | Pull upstream changes into tracked subtrees |
| `status` | Show subtrees, branches, and what changed |
| `branch [name]` | Create or show the current push branch |
| `push [subtree...]` | Push changed subtrees upstream |


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
unirepo pull [subtree...] [--prefix <name>]
```

Pulls upstream changes. Without arguments, pulls all tracked subtrees. When you use `--branch` without naming a subtree, `unirepo` skips tracked subtrees that do not have that upstream branch.

| Flag | Effect |
| --- | --- |
| `--prefix <name>` | Pull only one tracked subtree |
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
