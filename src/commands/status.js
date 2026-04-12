import {
  getConfiguredSubtreePushBranch,
  getCurrentBranch,
  getSubtreePrefixes,
  getChangedSubtrees,
  getTrackedSubtreeBranch,
  resolveSubtreePushBranch,
} from '../git.js';
import { validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export function buildStatusSubtrees({
  prefixes,
  changedPrefixes,
  currentBranch,
  getTrackedBranchFn = () => null,
  getConfiguredPushBranchFn = () => null,
}) {
  const changedNames = new Set(changedPrefixes.map((prefix) => prefix.name));

  return prefixes.map((prefix) => ({
    name: prefix.name,
    url: prefix.url,
    upstream: getTrackedBranchFn(prefix.name) || 'unknown',
    pushBranch: resolveSubtreePushBranch({
      configuredBranch: getConfiguredPushBranchFn(prefix.name),
      currentBranch,
    }),
    changed: changedNames.has(prefix.name),
  }));
}

export async function runStatus({ json }) {
  const cwd = process.cwd();

  validateInsideMonorepo(cwd);

  const currentBranch = getCurrentBranch(cwd);
  const prefixes = getSubtreePrefixes(cwd);
  const changed = getChangedSubtrees(cwd);
  const subtrees = buildStatusSubtrees({
    prefixes,
    changedPrefixes: changed,
    currentBranch,
    getTrackedBranchFn: (prefixName) => getTrackedSubtreeBranch(cwd, prefixName),
    getConfiguredPushBranchFn: (prefixName) => getConfiguredSubtreePushBranch(cwd, prefixName),
  });

  if (json) {
    console.log(JSON.stringify({ workspaceBranch: currentBranch, subtrees }, null, 2));
    return;
  }

  ui.subtreeTable(subtrees, currentBranch);
}
