import { git, getSubtreePrefixes, getTrackedSubtreeBranch, hasRemoteBranch, setConfiguredSubtreeBranch } from '../git.js';
import { validateGitSubtree, validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export function selectPullSubtrees(allPrefixes, requestedSubtrees) {
  if (!requestedSubtrees || requestedSubtrees.length === 0) {
    return allPrefixes;
  }

  const prefixNames = new Set(allPrefixes.map((prefix) => prefix.name));
  for (const name of requestedSubtrees) {
    if (!prefixNames.has(name)) {
      throw new Error(`"${name}" is not a tracked subtree. Run "unirepo status" to see available subtrees.`);
    }
  }

  return allPrefixes.filter((prefix) => requestedSubtrees.includes(prefix.name));
}

export function planPullTargets({
  allPrefixes,
  requestedSubtrees,
  branch,
  hasRemoteBranchFn = () => true,
}) {
  const explicitSelection = Boolean(requestedSubtrees && requestedSubtrees.length > 0);
  const selectedPrefixes = selectPullSubtrees(allPrefixes, requestedSubtrees);

  if (!branch || explicitSelection) {
    return { toPull: selectedPrefixes, skipped: [] };
  }

  const toPull = [];
  const skipped = [];

  for (const prefix of selectedPrefixes) {
    if (hasRemoteBranchFn(prefix.name, branch)) {
      toPull.push(prefix);
    } else {
      skipped.push(prefix);
    }
  }

  return { toPull, skipped };
}

export function resolvePullUpstreamBranch({ requestedBranch, trackedBranch }) {
  return requestedBranch || trackedBranch || 'main';
}

export async function runPull({ subtrees: requestedSubtrees, branch, fullHistory }) {
  const cwd = process.cwd();

  ui.header('Pulling subtrees');
  ui.blank();

  validateGitSubtree();
  validateInsideMonorepo(cwd);

  const allPrefixes = getSubtreePrefixes(cwd);
  const { toPull, skipped } = planPullTargets({
    allPrefixes,
    requestedSubtrees,
    branch,
    hasRemoteBranchFn: (remoteName, branchName) => hasRemoteBranch(cwd, remoteName, branchName),
  });

  if (toPull.length === 0) {
    if (branch && skipped.length > 0) {
      ui.info(`No tracked subtrees have upstream branch "${branch}". Nothing to pull.`);
    } else {
      ui.info('No tracked subtrees found. Nothing to pull.');
    }
    ui.blank();
    return;
  }

  if (skipped.length > 0) {
    ui.warning(`Skipping ${skipped.map((prefix) => prefix.name).join(', ')}: no upstream branch "${branch}"`);
    ui.blank();
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < toPull.length; i++) {
    const prefix = toPull[i];
    const trackedBranch = getTrackedSubtreeBranch(cwd, prefix.name);
    const upstreamBranch = resolvePullUpstreamBranch({
      requestedBranch: branch,
      trackedBranch,
    });
    const squashFlag = fullHistory ? '' : '--squash ';

    ui.repoStep(i + 1, toPull.length, prefix.name, 'Pulling');
    ui.repoDetail('Branch', upstreamBranch);
    ui.repoDetail('Mode', fullHistory ? 'full history' : 'squash');

    try {
      git(`subtree pull ${squashFlag}--prefix="${prefix.name}" "${prefix.name}" "${upstreamBranch}"`, { cwd });
      setConfiguredSubtreeBranch(cwd, prefix.name, upstreamBranch);
      ui.success(`${prefix.name} pulled`);
      succeeded++;
    } catch (err) {
      ui.error(`Failed to pull ${prefix.name}: ${err.message}`);
      failed++;
    }

    ui.blank();
  }

  if (failed === 0 && skipped.length === 0) {
    ui.success(`All ${succeeded} subtree(s) pulled`);
  } else if (failed === 0) {
    ui.success(`${succeeded} subtree(s) pulled, ${skipped.length} skipped`);
  } else {
    ui.warning(`${succeeded} pulled, ${failed} failed${skipped.length > 0 ? `, ${skipped.length} skipped` : ''}`);
  }
  ui.blank();
}
