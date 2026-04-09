import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { git, detectDefaultBranch, extractRepoName } from '../git.js';
import { validateGitSubtree, validateUrls, validateNoDuplicateNames, validateReachable } from '../validate.js';
import { AGENTS_MD, GITIGNORE } from '../templates.js';
import * as ui from '../ui.js';

export async function runInit({ dir, repos, fullHistory }) {
  const absDir = resolve(dir);

  if (existsSync(absDir)) {
    throw new Error(`Directory "${dir}" already exists. Choose a different name or remove it first.`);
  }

  // ── Preflight ────────────────────────────────────────────────────────────
  ui.header('Creating monorepo');
  ui.blank();

  ui.step(1, 3 + repos.length, 'Running preflight checks...');
  validateGitSubtree();
  validateUrls(repos);
  validateNoDuplicateNames(repos);
  for (const url of repos) {
    ui.info(`Checking ${url}...`);
    validateReachable(url);
  }
  ui.success('All checks passed');

  // From here on, clean up the directory if anything fails
  let created = false;
  try {
    // ── Initialize repo ──────────────────────────────────────────────────────
    ui.step(2, 3 + repos.length, 'Initializing git repository...');
    mkdirSync(absDir, { recursive: true });
    created = true;
    git('init', { cwd: absDir, silent: true });
    git('commit --allow-empty -m "chore: initial commit"', { cwd: absDir, silent: true });
    ui.repoDetail('Location', absDir);

    // ── Scaffold files ───────────────────────────────────────────────────────
    ui.step(3, 3 + repos.length, 'Writing scaffold files...');
    const scaffoldFiles = [];

    writeFileSync(join(absDir, 'AGENTS.md'), AGENTS_MD);
    scaffoldFiles.push('AGENTS.md');

    writeFileSync(join(absDir, '.gitignore'), GITIGNORE);
    scaffoldFiles.push('.gitignore');

    git(`add ${scaffoldFiles.join(' ')}`, { cwd: absDir, silent: true });
    git('commit -m "chore: add monorepo scaffolding"', { cwd: absDir, silent: true });
    ui.success(`Wrote ${scaffoldFiles.join(', ')}`);

    // ── Import repos ─────────────────────────────────────────────────────────
    for (let i = 0; i < repos.length; i++) {
      const url = repos[i];
      const name = extractRepoName(url);
      const stepNum = 4 + i;

      ui.blank();
      ui.repoStep(stepNum, 3 + repos.length, name, 'Importing');
      ui.repoDetail('URL', url);

      // Detect default branch
      const branch = detectDefaultBranch(url);
      ui.repoDetail('Branch', branch);

      // Add remote
      git(`remote add "${name}" "${url}"`, { cwd: absDir, silent: true });

      // Fetch
      if (fullHistory) {
        ui.repoDetail('Mode', 'full history');
        git(`fetch --no-tags "${name}" "${branch}"`, { cwd: absDir });
        git(`subtree add --prefix="${name}" "${name}" "${branch}"`, { cwd: absDir });
      } else {
        ui.repoDetail('Mode', 'shallow + squash');
        git(`fetch --no-tags --depth 1 "${name}" "${branch}"`, { cwd: absDir });
        git(`subtree add --squash --prefix="${name}" "${name}" "${branch}"`, { cwd: absDir });
      }

      ui.success(`${name} imported`);
    }
  } catch (err) {
    // Clean up partially created directory so the user can retry
    if (created) {
      try { rmSync(absDir, { recursive: true, force: true }); } catch {}
    }
    throw err;
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const subtreeNames = repos.map((url) => extractRepoName(url));
  ui.initSummary(absDir, repos.length, subtreeNames);
}
