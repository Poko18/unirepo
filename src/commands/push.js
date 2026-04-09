import { git, getCurrentBranch, getSubtreePrefixes, getChangedSubtrees, hasUncommittedChanges } from '../git.js';
import { validateGitSubtree, validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export async function runPush({ subtrees: requestedSubtrees, branch, dryRun }) {
  const cwd = process.cwd();

  // ── Preflight ────────────────────────────────────────────────────────────
  ui.header('Pushing subtrees');
  ui.blank();

  validateGitSubtree();
  validateInsideMonorepo(cwd);

  const currentBranch = getCurrentBranch(cwd);
  const pushBranch = branch || currentBranch;

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

  ui.info(`Branch: ${pushBranch}`);
  ui.info(`Subtrees to push: ${toPush.map((p) => p.name).join(', ')}`);
  ui.blank();

  // ── Dry run ──────────────────────────────────────────────────────────────
  if (dryRun) {
    const commands = toPush.map(
      (p) => `git subtree push --prefix="${p.name}" "${p.name}" "${pushBranch}"`
    );
    ui.dryRun(commands);
    return;
  }

  // ── Push each subtree serially ───────────────────────────────────────────
  let succeeded = 0;
  let failed = 0;

  for (const prefix of toPush) {
    ui.pushStart(prefix.name, pushBranch);
    ui.pushSlow();
    try {
      git(`subtree push --prefix="${prefix.name}" "${prefix.name}" "${pushBranch}"`, { cwd });
      ui.success(`${prefix.name} pushed`);
      succeeded++;
    } catch (err) {
      ui.error(`Failed to push ${prefix.name}: ${err.message}`);
      failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  ui.blank();
  if (failed === 0) {
    ui.success(`All ${succeeded} subtree(s) pushed to branch "${pushBranch}"`);
  } else {
    ui.warning(`${succeeded} pushed, ${failed} failed`);
  }
  ui.blank();
}
