import { git, getRemoteBranch, getSubtreePrefixes } from '../git.js';
import { validateGitSubtree, validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export async function runPull({ subtrees: requestedSubtrees, branch, fullHistory }) {
  const cwd = process.cwd();

  ui.header('Pulling subtrees');
  ui.blank();

  validateGitSubtree();
  validateInsideMonorepo(cwd);

  const allPrefixes = getSubtreePrefixes(cwd);
  let toPull;

  if (requestedSubtrees && requestedSubtrees.length > 0) {
    const prefixNames = new Set(allPrefixes.map((prefix) => prefix.name));
    for (const name of requestedSubtrees) {
      if (!prefixNames.has(name)) {
        throw new Error(`"${name}" is not a tracked subtree. Run "unirepo status" to see available subtrees.`);
      }
    }
    toPull = allPrefixes.filter((prefix) => requestedSubtrees.includes(prefix.name));
  } else {
    toPull = allPrefixes;
  }

  if (toPull.length === 0) {
    ui.info('No tracked subtrees found. Nothing to pull.');
    ui.blank();
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < toPull.length; i++) {
    const prefix = toPull[i];
    const upstreamBranch = branch || getRemoteBranch(cwd, prefix.name) || 'main';
    const squashFlag = fullHistory ? '' : '--squash ';

    ui.repoStep(i + 1, toPull.length, prefix.name, 'Pulling');
    ui.repoDetail('Branch', upstreamBranch);
    ui.repoDetail('Mode', fullHistory ? 'full history' : 'squash');

    try {
      git(`subtree pull ${squashFlag}--prefix="${prefix.name}" "${prefix.name}" "${upstreamBranch}"`, { cwd });
      ui.success(`${prefix.name} pulled`);
      succeeded++;
    } catch (err) {
      ui.error(`Failed to pull ${prefix.name}: ${err.message}`);
      failed++;
    }

    ui.blank();
  }

  if (failed === 0) {
    ui.success(`All ${succeeded} subtree(s) pulled`);
  } else {
    ui.warning(`${succeeded} pulled, ${failed} failed`);
  }
  ui.blank();
}