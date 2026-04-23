import {
  git,
  getMonorepoRoot,
  getRemoteBranch,
  getSubtreePrefixes,
  setConfiguredSubtreeBranch,
  unsetConfiguredSubtreePushBranch,
  setLastPushedRef,
  hasUncommittedChanges,
} from '../git.js';
import { validateGitSubtree, validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export async function runReset({ subtrees: requestedSubtrees, branch, dryRun }) {
  const cwd = getMonorepoRoot(process.cwd());

  ui.header('Resetting subtrees');
  ui.blank();

  validateGitSubtree();
  validateInsideMonorepo(cwd);

  if (hasUncommittedChanges(cwd)) {
    ui.error('You have uncommitted changes. Commit or stash before resetting.');
    ui.blank();
    process.exit(1);
  }

  const allPrefixes = getSubtreePrefixes(cwd);

  let prefixes;
  if (requestedSubtrees && requestedSubtrees.length > 0) {
    const names = new Set(allPrefixes.map((p) => p.name));
    for (const name of requestedSubtrees) {
      if (!names.has(name)) {
        throw new Error(`"${name}" is not a tracked subtree. Run "unirepo status" to see available subtrees.`);
      }
    }
    prefixes = allPrefixes.filter((p) => requestedSubtrees.includes(p.name));
  } else {
    prefixes = allPrefixes;
  }

  if (prefixes.length === 0) {
    ui.info('No tracked subtrees found. Nothing to reset.');
    ui.blank();
    return;
  }

  // Use the remote's actual default branch — not the stored config which may be a stale feature branch.
  const targets = prefixes.map((p) => ({
    ...p,
    upstreamBranch: branch || getRemoteBranch(cwd, p.name) || 'main',
  }));

  const uniqueBranches = [...new Set(targets.map((t) => t.upstreamBranch))];
  if (uniqueBranches.length === 1) {
    ui.info(`Resetting all subtrees to branch: ${uniqueBranches[0]}`);
  } else {
    ui.info('Resetting subtrees to their upstream default branches');
  }
  ui.blank();

  if (dryRun) {
    const commands = targets.flatMap((t) => [
      `git subtree pull --squash --prefix="${t.name}" "${t.name}" "${t.upstreamBranch}"`,
      `git config unirepo.subtree.${t.name}.branch "${t.upstreamBranch}"`,
      `git config --unset unirepo.subtree.${t.name}.pushBranch`,
    ]);
    ui.dryRun(commands);
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    ui.repoStep(i + 1, targets.length, target.name, 'Resetting');
    ui.repoDetail('Branch', target.upstreamBranch);

    try {
      git(`subtree pull --squash --prefix="${target.name}" "${target.name}" "${target.upstreamBranch}"`, { cwd });
      const headRef = git('rev-parse HEAD', { cwd, silent: true });
      setConfiguredSubtreeBranch(cwd, target.name, target.upstreamBranch);
      unsetConfiguredSubtreePushBranch(cwd, target.name);
      setLastPushedRef(cwd, target.name, headRef);
      ui.success(`${target.name} reset to ${target.upstreamBranch}`);
      succeeded++;
    } catch (err) {
      ui.error(`Failed to reset ${target.name}: ${err.message}`);
      failed++;
    }

    ui.blank();
  }

  if (failed === 0) {
    ui.success(`All ${succeeded} subtree(s) reset`);
  } else {
    ui.warning(`${succeeded} reset, ${failed} failed`);
  }
  ui.blank();
}
