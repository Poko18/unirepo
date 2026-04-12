export const AGENTS_MD = `# Monorepo Workflow

## Model

This repository is a git-subtree monorepo.

- Each top-level subtree directory maps to an upstream repository.
- Subtree directory names often match git remote names, but verify the mapping before manual subtree commands.
- Run monorepo commands from the repository root.

## Rules

- Never use regular \`git push\` to publish the monorepo itself as a deployment target.
- Work in a single monorepo branch and reuse that branch name when pushing subtree branches upstream.
- Keep changes scoped to the subtree or subtrees you intend to update.
- Edit files inside subtree directories, not in unrelated top-level folders.
- Prefer separate commits per subtree unless the change is tightly coupled across repos.
- Push only subtrees that actually changed.
- Keep subtree directory, remote name, and pushed branch consistent.
- Do not mix files from different subtrees in a subtree PR.

## CLI

Preferred when the \`unirepo\` CLI is available:

\`\`\`bash
unirepo version
unirepo status
unirepo branch <branch>
unirepo pull
unirepo push --dry-run
unirepo push
unirepo pr --title "feat: ..." --body "..."
unirepo add <repo-url> --branch <branch>
\`\`\`

- \`status\` shows tracked subtrees, upstream branches, the current push branch, and changed files.
- \`branch <name>\` creates the local branch name you should reuse when pushing subtrees upstream.
- \`pull\` updates one or more tracked subtrees from upstream before or during your work. Use \`--prefix\` when you want a branch-specific pull for just one subtree.
- \`push --dry-run\` is the safe first step before a real push.
- \`push\` without subtree names auto-detects changed subtrees. \`push <subtree>\` pushes one subtree.
- \`pr\` opens one PR per changed or explicitly selected subtree repo after those branches have been pushed.
- \`add\` imports another repository as a subtree. Use \`--branch\` to import from a non-default upstream branch.

## Workflow

1. Create or reuse one branch name for the work.
CLI:
\`\`\`bash
unirepo branch <branch>
\`\`\`
Git:
\`\`\`bash
git checkout -b <branch>
\`\`\`

2. Pull upstream updates when needed.
CLI:
\`\`\`bash
unirepo pull
unirepo pull --prefix <subtree> --branch <branch>
\`\`\`
Git:
\`\`\`bash
git subtree pull --prefix=<subtree> <remote-or-url> <branch> --squash
\`\`\`

3. Make changes inside one or more subtree directories.

4. Commit in the monorepo. Prefer one commit per subtree unless the change is intentionally coupled.
\`\`\`bash
git add <subtree>/
git commit -m "feat(<subtree>): ..."
\`\`\`

5. Inspect what changed before pushing.
CLI:
\`\`\`bash
unirepo status
\`\`\`
Git:
\`\`\`bash
git diff --name-only HEAD
\`\`\`

6. Push only changed subtrees.
CLI:
\`\`\`bash
unirepo push --dry-run
unirepo push
unirepo push <subtree>
\`\`\`
Git:
\`\`\`bash
git subtree push --prefix=<subtree> <remote-or-url> <branch>
\`\`\`

7. Open one PR per upstream subtree repo after push.
CLI:
\`\`\`bash
unirepo pr --title "feat: ..." --body "..."
unirepo pr <subtree> --title "feat: ..."
\`\`\`

## Raw Git Subtree

Use these when operating without the CLI:

\`\`\`bash
# Add a subtree
git subtree add --prefix=libfoo https://github.com/example/libfoo.git main --squash

# Pull updates from upstream
git subtree pull --prefix=libfoo https://github.com/example/libfoo.git main --squash

# Push local changes upstream
git subtree push --prefix=libfoo https://github.com/example/libfoo.git <branch>
\`\`\`

- If subtree directory and remote name match, the remote name often works in place of the full URL.
- Reuse the same branch name across the monorepo and each upstream subtree repo.

## PRs

- Open one PR per upstream subtree repo.
- Use the same branch name in each upstream repo.
- Target the default branch of the upstream repo unless that repo's workflow says otherwise.
- Run \`unirepo pr\` only after the head branch exists upstream for that subtree repo.
- Ensure each PR contains only changes from its own subtree.
`;

export const GITIGNORE = `.DS_Store

.idea/
.vscode/

*.swp
*.swo
`;
