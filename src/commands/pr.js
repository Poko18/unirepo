import {
  getConfiguredSubtreePushBranch,
  getCurrentBranch,
  getSubtreePrefixes,
  getChangedSubtrees,
  getTrackedSubtreeBranch,
  hasRemoteBranch,
  resolveSubtreePushBranch,
} from '../git.js';
import { isGhAvailable, getGitHubRepoSlugFromUrl, createPullRequest } from '../github.js';
import { validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

function quoteShellArg(value) {
  return JSON.stringify(value);
}

export function selectPrSubtrees(allPrefixes, changedPrefixes, requestedSubtrees) {
  if (!requestedSubtrees || requestedSubtrees.length === 0) {
    return changedPrefixes;
  }

  const prefixNames = new Set(allPrefixes.map((prefix) => prefix.name));
  for (const name of requestedSubtrees) {
    if (!prefixNames.has(name)) {
      throw new Error(`"${name}" is not a tracked subtree. Run "unirepo status" to see available subtrees.`);
    }
  }

  return allPrefixes.filter((prefix) => requestedSubtrees.includes(prefix.name));
}

export function resolvePrBaseBranch({ requestedBase, trackedBranch }) {
  return requestedBase || trackedBranch || 'main';
}

export function planPrTargets({
  allPrefixes,
  changedPrefixes,
  requestedSubtrees,
  requestedBase,
  requestedHead,
  currentBranch,
  getTrackedBranchFn = () => null,
  getConfiguredPushBranchFn = () => null,
  getRepoSlugFn = () => null,
}) {
  return selectPrSubtrees(allPrefixes, changedPrefixes, requestedSubtrees).map((prefix) => ({
    name: prefix.name,
    repo: getRepoSlugFn(prefix.url),
    url: prefix.url,
    base: resolvePrBaseBranch({
      requestedBase,
      trackedBranch: getTrackedBranchFn(prefix.name),
    }),
    head: resolveSubtreePushBranch({
      requestedBranch: requestedHead,
      configuredBranch: getConfiguredPushBranchFn(prefix.name),
      currentBranch,
    }),
  }));
}

export async function runPr({ subtrees: requestedSubtrees, title, body, base, head, draft, dryRun }) {
  const cwd = process.cwd();

  ui.header('Creating pull requests');
  ui.blank();

  validateInsideMonorepo(cwd);

  if (!isGhAvailable()) {
    throw new Error('GitHub CLI is not available or not authenticated. Install gh and run "gh auth login".');
  }

  const currentBranch = getCurrentBranch(cwd);
  const allPrefixes = getSubtreePrefixes(cwd);
  const changedPrefixes = getChangedSubtrees(cwd);
  const targets = planPrTargets({
    allPrefixes,
    changedPrefixes,
    requestedSubtrees,
    requestedBase: base,
    requestedHead: head,
    currentBranch,
    getTrackedBranchFn: (prefixName) => getTrackedSubtreeBranch(cwd, prefixName),
    getConfiguredPushBranchFn: (prefixName) => getConfiguredSubtreePushBranch(cwd, prefixName),
    getRepoSlugFn: getGitHubRepoSlugFromUrl,
  });

  if (targets.length === 0) {
    ui.info('No changed subtrees detected. Nothing to open PRs for.');
    ui.info('Push a changed subtree first or pass explicit subtree names.');
    ui.blank();
    return;
  }

  const uniqueHeadBranches = [...new Set(targets.map((target) => target.head))];
  if (uniqueHeadBranches.length === 1) {
    ui.info(`Head branch: ${uniqueHeadBranches[0]}`);
  } else {
    ui.info('Head branches: per subtree');
  }
  ui.info(`Subtrees: ${targets.map((target) => target.name).join(', ')}`);
  ui.blank();

  const dryRunCommands = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    ui.repoStep(i + 1, targets.length, target.name, dryRun ? 'Planning PR for' : 'Opening PR for');
    ui.repoDetail('Repo', target.repo || target.url);
    ui.repoDetail('Base', target.base);
    ui.repoDetail('Head', target.head);

    if (!target.repo) {
      ui.error(`Failed to open PR for ${target.name}: remote URL is not a GitHub repository.`);
      failed++;
      ui.blank();
      continue;
    }

    if (!hasRemoteBranch(cwd, target.name, target.head)) {
      ui.error(`Failed to open PR for ${target.name}: upstream branch "${target.head}" does not exist. Run "unirepo push ${target.name}" first.`);
      failed++;
      ui.blank();
      continue;
    }

    if (!hasRemoteBranch(cwd, target.name, target.base)) {
      ui.error(`Failed to open PR for ${target.name}: base branch "${target.base}" does not exist upstream.`);
      failed++;
      ui.blank();
      continue;
    }

    const ghCommand = [
      'gh pr create',
      `--repo ${quoteShellArg(target.repo)}`,
      `--base ${quoteShellArg(target.base)}`,
      `--head ${quoteShellArg(target.head)}`,
      `--title ${quoteShellArg(title)}`,
      `--body ${quoteShellArg(body)}`,
      draft ? '--draft' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (dryRun) {
      dryRunCommands.push(ghCommand);
      succeeded++;
      ui.success(`${target.name} PR planned`);
      ui.blank();
      continue;
    }

    try {
      const url = createPullRequest({
        repo: target.repo,
        base: target.base,
        head: target.head,
        title,
        body,
        draft,
      });
      ui.success(`${target.name} PR opened${url ? `: ${url}` : ''}`);
      succeeded++;
    } catch (err) {
      ui.error(`Failed to open PR for ${target.name}: ${err.message}`);
      failed++;
    }

    ui.blank();
  }

  if (dryRunCommands.length > 0) {
    ui.dryRun(dryRunCommands);
  }

  if (failed === 0) {
    ui.success(`${dryRun ? 'Planned' : 'Opened'} ${succeeded} pull request(s)`);
  } else {
    ui.warning(`${dryRun ? 'Planned' : 'Opened'} ${succeeded}, ${failed} failed`);
  }
  ui.blank();
}
