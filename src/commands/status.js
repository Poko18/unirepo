import { getCurrentBranch, getSubtreePrefixes, getChangedSubtrees, getRemoteBranch } from '../git.js';
import { validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export async function runStatus({ json }) {
  const cwd = process.cwd();

  validateInsideMonorepo(cwd);

  const branch = getCurrentBranch(cwd);
  const prefixes = getSubtreePrefixes(cwd);
  const changed = getChangedSubtrees(cwd);
  const changedNames = new Set(changed.map((c) => c.name));

  const subtrees = prefixes.map((p) => ({
    name: p.name,
    url: p.url,
    upstream: getRemoteBranch(cwd, p.name) || 'unknown',
    pushBranch: branch,
    changed: changedNames.has(p.name),
  }));

  if (json) {
    console.log(JSON.stringify({ pushBranch: branch, subtrees }, null, 2));
    return;
  }

  ui.subtreeTable(subtrees, branch);
}
