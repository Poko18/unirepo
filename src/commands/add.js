import { git, detectDefaultBranch, extractRepoName } from '../git.js';
import { validateGitSubtree, validateUrls, validateInsideMonorepo, validateNameAvailable, validateReachable } from '../validate.js';
import * as ui from '../ui.js';

export async function runAdd({ url, prefix, fullHistory }) {
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
  ui.step(2, 4, `Detecting default branch for ${ui.info ? '' : ''}${name}...`);
  const branch = detectDefaultBranch(url);
  ui.repoDetail('Branch', branch);

  // ── Add remote + fetch ───────────────────────────────────────────────────
  ui.step(3, 4, 'Adding remote and fetching...');
  git(`remote add "${name}" "${url}"`, { cwd, silent: true });

  if (fullHistory) {
    ui.repoDetail('Mode', 'full history');
    git(`fetch --no-tags "${name}" "${branch}"`, { cwd });
    git(`subtree add --prefix="${name}" "${name}" "${branch}"`, { cwd });
  } else {
    ui.repoDetail('Mode', 'shallow + squash');
    git(`fetch --no-tags --depth 1 "${name}" "${branch}"`, { cwd });
    git(`subtree add --squash --prefix="${name}" "${name}" "${branch}"`, { cwd });
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  ui.step(4, 4, 'Done!');
  ui.addSummary(name, url);
}
