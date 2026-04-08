export const AGENTS_MD = `# Monorepo Workflow

## What This Repository Is

This repository is a git-subtree monorepo.

- Each top-level subtree directory maps to an upstream repository.
- Subtree directory names often match git remote names, but verify the mapping in the repo before pushing.
- Work in this monorepo and push changes back out through subtree remotes.

## Core Rules

- Never use regular \`git push\` to publish the monorepo itself as a deployment target.
- Work in a single monorepo branch and reuse that branch name when pushing subtree branches upstream.
- Keep changes scoped to the subtree or subtrees you intend to update.
- Prefer separate commits per subtree unless the change is tightly coupled across repos.
- Push only subtrees that actually changed.
- Keep subtree directory, remote name, and pushed branch consistent.
- Do not mix files from different subtrees in a subtree PR.

## How To Work In This Monorepo

- Run monorepo management commands from the repository root.
- Edit files inside subtree directories, not in unrelated top-level folders.
- Commit in the monorepo, then push the changed subtree or subtrees upstream.
- Reuse the same branch name across the monorepo and each upstream subtree repo.

If you are using the \`subtree-monorepo\` CLI, these are the main commands:

\`\`\`bash
subtree-monorepo status
subtree-monorepo branch <branch>
subtree-monorepo push --dry-run
subtree-monorepo push
subtree-monorepo add <repo-url>
\`\`\`


\`status\` shows tracked subtrees, upstream branches, the current push branch, and which subtrees changed.

\`branch <name>\` creates a new local branch in the monorepo. That branch name becomes the branch you reuse when pushing subtrees upstream.

\`push --dry-run\` is the safe first step before a real push. \`push\` without subtree names auto-detects changed subtrees. \`push <subtree>\` pushes only the named subtree.

## Standard Workflow

### 1. Create a branch

\`\`\`bash
git checkout -b <branch>
\`\`\`

Use the same branch name for all subtree pushes from this monorepo.

### 2. Make changes

Edit files inside one or more top-level subtree directories.

Examples:

- \`<subtree-a>/...\`
- \`<subtree-b>/...\`

### 3. Commit

Preferred, separate commits per subtree:

\`\`\`bash
git add <subtree-a>/
git commit -m "feat(<subtree-a>): ..."
\`\`\`

\`\`\`bash
git add <subtree-b>/
git commit -m "feat(<subtree-b>): ..."
\`\`\`

Combined commits across subtrees are allowed when the change is genuinely coupled.

### 4. Determine changed subtrees

Before pushing or suggesting push commands, identify which top-level subtrees actually changed.

Quick overview:

\`\`\`bash
git diff --name-only HEAD
\`\`\`

Check one subtree at a time:

\`\`\`bash
git diff --quiet HEAD -- <subtree>
\`\`\`

Push only changed subtrees. Do not suggest subtree pushes for untouched repos.

### 5. Push changed subtrees

Manual pattern:

\`\`\`bash
git diff --quiet HEAD -- <subtree> || git subtree push --prefix=<subtree> <remote> <branch>
\`\`\`

If the subtree directory and remote name are the same, the push command usually looks like this:

\`\`\`bash
git subtree push --prefix=<subtree> <subtree> <branch>
\`\`\`

With the \`subtree-monorepo\` CLI, the equivalent is:

\`\`\`bash
subtree-monorepo push <subtree>
\`\`\`

## Pull Request Model

- Open one PR per upstream subtree repo.
- Use the same branch name in each upstream repo.
- Target the default branch of the upstream repo unless that repo's workflow says otherwise.
- Ensure each PR contains only changes from its own subtree.

## Verify Before Pushing

When the mapping is not obvious, inspect the repo instead of assuming.

Useful commands:

\`\`\`bash
git remote -v
git diff --name-only HEAD
\`\`\`

If needed, inspect the top-level directories in the monorepo to confirm subtree names.
`;

export const GITIGNORE = `.DS_Store

.idea/
.vscode/

*.swp
*.swo
`;
