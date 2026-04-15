import {
  git,
  getConfiguredSubtreePushBranch,
  getCurrentBranch,
  getMonorepoRoot,
  getSubtreePrefixes,
  getChangedSubtrees,
  hasUncommittedChanges,
  resolveSubtreePushBranch,
  setLastPushedRef,
} from '../git.js';
import { validateGitSubtree, validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export async function runPush({ subtrees: requestedSubtrees, branch, dryRun }) {
  const cwd = getMonorepoRoot(process.cwd());

  // ── Preflight ────────────────────────────────────────────────────────────
  ui.header('Pushing subtrees');
  ui.blank();

  validateGitSubtree();
  validateInsideMonorepo(cwd);

  const currentBranch = getCurrentBranch(cwd);

  // ── Check for uncommitted work ────────────────────────────────────────────
  const hasUncommitted = hasUncommittedChanges(cwd);
  if (hasUncommitted) {
    ui.warning('You have uncommitted changes. Only committed work will be pushed upstream.');
    ui.info('Commit your changes first, then run push again.');
    ui.blank();
  }

  // ── Determine which subtrees to push ─────────────────────────────────────
  let toPush;

  if (requestedSubtrees && requestedSubtrees.length > 0) {
    // Validate that requested subtrees exist
    const allPrefixes = getSubtreePrefixes(cwd);
    const prefixNames = new Set(allPrefixes.map((p) => p.name));
    for (const name of requestedSubtrees) {
      if (!prefixNames.has(name)) {
        throw new Error(`"${name}" is not a tracked subtree. Run "unirepo status" to see available subtrees.`);
      }
    }
    toPush = allPrefixes.filter((p) => requestedSubtrees.includes(p.name));
  } else {
    // Auto-detect changed subtrees
    toPush = getChangedSubtrees(cwd);
    if (toPush.length === 0) {
      ui.info('No changed subtrees detected. Nothing to push.');
      if (!hasUncommitted) {
        ui.info('Make changes inside subtree directories and commit before pushing.');
      }
      ui.blank();
      return;
    }
  }

  const targets = toPush.map((prefix) => ({
    ...prefix,
    pushBranch: resolveSubtreePushBranch({
      requestedBranch: branch,
      configuredBranch: getConfiguredSubtreePushBranch(cwd, prefix.name),
      currentBranch,
    }),
  }));
  const uniqueBranches = [...new Set(targets.map((target) => target.pushBranch))];

  if (uniqueBranches.length === 1) {
    ui.info(`Branch: ${uniqueBranches[0]}`);
  } else {
    ui.info('Branches: per subtree');
  }
  ui.info(`Subtrees to push: ${targets.map((target) => `${target.name}:${target.pushBranch}`).join(', ')}`);
  ui.blank();

  // ── Dry run ──────────────────────────────────────────────────────────────
  if (dryRun) {
    const commands = targets.map(
      (target) => `git subtree push --prefix="${target.name}" "${target.name}" "${target.pushBranch}"`
    );
    ui.dryRun(commands);
    return;
  }

  // ── Push each subtree serially ───────────────────────────────────────────
  let succeeded = 0;
  let failed = 0;

  for (const target of targets) {
    ui.pushStart(target.name, target.pushBranch);
    ui.pushSlow();
    try {
      git(`subtree push --prefix="${target.name}" "${target.name}" "${target.pushBranch}"`, { cwd });
      const headRef = git('rev-parse HEAD', { cwd, silent: true });
      setLastPushedRef(cwd, target.name, headRef);
      ui.success(`${target.name} pushed`);
      succeeded++;
    } catch (err) {
      ui.error(`Failed to push ${target.name}: ${err.message}`);
      failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  ui.blank();
  if (failed === 0) {
    if (uniqueBranches.length === 1) {
      ui.success(`All ${succeeded} subtree(s) pushed to branch "${uniqueBranches[0]}"`);
    } else {
      ui.success(`All ${succeeded} subtree(s) pushed`);
    }
  } else {
    ui.warning(`${succeeded} pushed, ${failed} failed`);
  }
  ui.blank();
}
