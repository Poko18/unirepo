import {
  git,
  getConfiguredSubtreePushBranch,
  getCurrentBranch,
  getMonorepoRoot,
  getSubtreePrefixes,
  getTrackedSubtreeBranch,
  resolveSubtreePushBranch,
} from '../git.js';
import { validateInsideMonorepo } from '../validate.js';
import * as ui from '../ui.js';

export async function runBranch({ name }) {
  const cwd = getMonorepoRoot(process.cwd());

  validateInsideMonorepo(cwd);

  const subtrees = getSubtreePrefixes(cwd);
  const currentBranch = getCurrentBranch(cwd);

  if (!name) {
    // No name given — show current state
    ui.header('Branch');
    ui.blank();
    ui.info(`Current branch: ${currentBranch}`);
    ui.blank();
    for (const s of subtrees) {
      const upstream = getTrackedSubtreeBranch(cwd, s.name) || 'unknown';
      const configuredPushBranch = getConfiguredSubtreePushBranch(cwd, s.name);
      const pushBranch = resolveSubtreePushBranch({
        configuredBranch: configuredPushBranch,
        currentBranch,
      });
      const suffix = configuredPushBranch ? ' (configured)' : '';
      ui.info(`  ${s.name}  upstream: ${upstream}  push target: ${pushBranch}${suffix}`);
    }
    ui.blank();
    ui.info('Use "unirepo branch <name>" to switch the workspace branch. Subtrees without a configured override use that branch by default.');
    ui.blank();
    return;
  }

  ui.header('Branch');
  ui.blank();

  if (currentBranch === name) {
    ui.info(`Already on branch "${name}"`);
    ui.blank();
    return;
  }

  // Create and switch to the new branch locally
  git(`checkout -b "${name}"`, { cwd, silent: true });
  ui.success(`Switched to new branch "${name}"`);
  ui.blank();

  for (const s of subtrees) {
    const configuredPushBranch = getConfiguredSubtreePushBranch(cwd, s.name);
    const pushBranch = resolveSubtreePushBranch({
      configuredBranch: configuredPushBranch,
      currentBranch: name,
    });
    if (configuredPushBranch && configuredPushBranch !== name) {
      ui.success(`${s.name} → push will target "${pushBranch}" upstream (configured override)`);
    } else {
      ui.success(`${s.name} → push will target "${pushBranch}" upstream`);
    }
  }

  ui.blank();
  ui.info('Next steps:');
  ui.info('  1. Make changes in subtree directories');
  ui.info('  2. Commit in the monorepo');
  ui.info(`  3. unirepo push`);
  ui.info('  4. unirepo pr --title "..." --body "..."');
  ui.blank();
}
