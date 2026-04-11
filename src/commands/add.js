import { git, detectDefaultBranch, extractRepoName, setConfiguredSubtreeBranch } from '../git.js';
import { validateGitSubtree, validateUrls, validateInsideMonorepo, validateNameAvailable, validateReachable } from '../validate.js';
import * as ui from '../ui.js';

export async function runAdd({ url, prefix, branch, fullHistory }) {
  const cwd = process.cwd();

  // ── Preflight ────────────────────────────────────────────────────────────
  ui.header('Adding repository');
  ui.blank();

  ui.step(1, 4, 'Running preflight checks...');
  validateGitSubtree();
  validateInsideMonorepo(cwd);
  validateUrls([url]);

  const name = prefix || extractRepoName(url);
  validateNameAvailable(name, cwd);
  ui.info(`Checking ${url}...`);
  validateReachable(url);
  ui.success('All checks passed');

  // ── Detect branch ────────────────────────────────────────────────────────
  ui.step(2, 4, branch ? `Using upstream branch for ${name}...` : `Detecting default branch for ${name}...`);
  const upstreamBranch = branch || detectDefaultBranch(url);
  ui.repoDetail('Branch', upstreamBranch);

  // ── Add remote + fetch ───────────────────────────────────────────────────
  ui.step(3, 4, 'Adding remote and fetching...');
  git(`remote add "${name}" "${url}"`, { cwd, silent: true });

  if (fullHistory) {
    ui.repoDetail('Mode', 'full history');
    git(`fetch --no-tags "${name}" "${upstreamBranch}"`, { cwd });
    git(`subtree add --prefix="${name}" "${name}" "${upstreamBranch}"`, { cwd });
  } else {
    ui.repoDetail('Mode', 'shallow + squash');
    git(`fetch --no-tags --depth 1 "${name}" "${upstreamBranch}"`, { cwd });
    git(`subtree add --squash --prefix="${name}" "${name}" "${upstreamBranch}"`, { cwd });
  }

  setConfiguredSubtreeBranch(cwd, name, upstreamBranch);

  // ── Done ─────────────────────────────────────────────────────────────────
  ui.step(4, 4, 'Done!');
  ui.addSummary(name, url);
}
