# subtree-monorepo

A CLI for creating and managing git-subtree monorepos.

Use it to pull multiple repositories into one working monorepo, make changes in subtree directories, and push only the changed subtrees back to their upstream repositories.

## What it does

```bash
npx subtree-monorepo init my-monorepo https://github.com/org/api.git https://github.com/org/web.git

cd my-monorepo
npx subtree-monorepo branch feature-x
npx subtree-monorepo status
npx subtree-monorepo push --dry-run
npx subtree-monorepo push
```

It helps you:

- create a monorepo from multiple upstream repositories
- add more repositories later as subtrees
- inspect tracked subtrees, upstream branches, and changed directories
- keep one branch name across the monorepo and pushed subtree branches
- push only the subtrees that actually changed

## Install

Install globally:

```bash
npm install -g subtree-monorepo
```

Or run without installing:

```bash
npx subtree-monorepo --help
```

For local development in this repository:

```bash
node src/index.js --help
```

## Requirements

- Node.js 18+
- Git with `git subtree` available

## Commands

| Command | What it does |
| --- | --- |
| `init` | Create a new monorepo and import one or more upstream repositories |
| `add` | Add another repository to an existing subtree monorepo |
| `status` | Show tracked subtrees, upstream branches, current push branch, and changed subtrees |
| `branch` | Create or inspect the branch name that will be reused for subtree pushes |
| `push` | Push all changed subtrees, or selected subtrees, upstream |

## Usage

### Init

Create a new monorepo and import one or more repositories.

```bash
subtree-monorepo init <dir> <repo-url> [repo-url...]
```

Options:

- `--full-history` imports full git history instead of shallow squash imports

Example:

```bash
subtree-monorepo init my-monorepo https://github.com/org/api.git https://github.com/org/web.git
```

The generated monorepo includes:

- `AGENTS.md` with workflow instructions for humans and coding agents
- `.gitignore` with editor and OS ignores

### Add

Add another upstream repository to an existing subtree monorepo.

```bash
subtree-monorepo add <repo-url> [--prefix <name>] [--full-history]
```

Examples:

```bash
subtree-monorepo add https://github.com/org/shared.git
subtree-monorepo add https://github.com/org/shared.git --prefix shared-lib
```

### Status

Show tracked subtrees, upstream branches, the current push branch, and which subtrees changed.

```bash
subtree-monorepo status
subtree-monorepo status --json
```

Use this before pushing to confirm which subtrees will be affected.

### Branch

Create a new branch in the monorepo. That branch name is then reused when pushing subtrees upstream.

```bash
subtree-monorepo branch <name>
```

If you run `subtree-monorepo branch` with no name, it shows the current branch and push target state.

### Push

Push changed subtrees upstream.

```bash
subtree-monorepo push
subtree-monorepo push --dry-run
subtree-monorepo push <subtree>
subtree-monorepo push --branch <name>
```

Without explicit subtree names, the command auto-detects changed subtrees.

## Recommended Workflow

1. Create or switch to a branch for the work.
2. Edit files inside one or more subtree directories.
3. Commit in the monorepo.
4. Check what changed with `subtree-monorepo status`.
5. Run `subtree-monorepo push --dry-run`.
6. Push changed subtrees with `subtree-monorepo push`.
7. Open one PR per upstream subtree repository.

## How it works

1. `init` creates a fresh git repository, writes scaffold files, and imports each upstream repository as a subtree.
2. `status` inspects remotes, top-level directories, and git history to determine tracked subtrees and changed prefixes.
3. `branch` keeps the monorepo on one branch name that you can reuse when pushing each subtree upstream.
4. `push` either auto-detects changed subtrees or uses the subtree names you provide, then runs `git subtree push` for each one.

## Notes

- The monorepo itself is not the deployment target.
- Prefer separate commits per subtree unless the change is tightly coupled.
- Keep subtree directory names and remote names aligned when possible.
- Push only the subtrees that actually changed.

## License

MIT
