import chalk from 'chalk';

// ── Icons ──────────────────────────────────────────────────────────────────────

const ICON = {
  check:   chalk.green('✔'),
  cross:   chalk.red('✖'),
  arrow:   chalk.cyan('→'),
  warn:    chalk.yellow('⚠'),
  folder:  chalk.blue('📁'),
  branch:  chalk.magenta('⎇'),
  rocket:  chalk.yellow('🚀'),
  search:  chalk.cyan('🔍'),
  git:     chalk.red('⬡'),
  package: chalk.green('📦'),
  dot:     chalk.dim('·'),
};

// ── Core Output ────────────────────────────────────────────────────────────────

export function header(text) {
  console.log();
  console.log(chalk.bold.cyan(`  ${ICON.git}  ${text}`));
  console.log(chalk.dim('  ' + '─'.repeat(50)));
}

export function step(n, total, text) {
  const prefix = chalk.dim(`  [${n}/${total}]`);
  console.log(`${prefix} ${text}`);
}

export function success(text) {
  console.log(`  ${ICON.check} ${chalk.green(text)}`);
}

export function error(text) {
  console.log(`  ${ICON.cross} ${chalk.red(text)}`);
}

export function warning(text) {
  console.log(`  ${ICON.warn} ${chalk.yellow(text)}`);
}

export function info(text) {
  console.log(`  ${chalk.dim(text)}`);
}

export function blank() {
  console.log();
}

// ── Specialized Output ─────────────────────────────────────────────────────────

export function repoStep(n, total, name, action) {
  const prefix = chalk.dim(`  [${n}/${total}]`);
  const repoName = chalk.bold.white(name);
  console.log(`${prefix} ${action} ${repoName}`);
}

export function repoDetail(label, value) {
  console.log(`        ${chalk.dim(label + ':')} ${value}`);
}

export function subtreeTable(subtrees, currentBranch) {
  header('Monorepo Status');
  blank();
  console.log(`  ${ICON.folder} Subtrees: ${chalk.bold(subtrees.length)}`);
  console.log(`  ${ICON.rocket} Push branch: ${chalk.bold.cyan(currentBranch)}`);
  blank();

  if (subtrees.length === 0) {
    info('No subtrees found. Use "subtree-monorepo add" to add repos.');
    blank();
    return;
  }

  // Column widths
  const nameWidth = Math.max(12, ...subtrees.map((s) => s.name.length)) + 2;
  const upstreamWidth = Math.max(10, ...subtrees.map((s) => (s.upstream || '').length)) + 2;
  const pushWidth = Math.max(12, currentBranch.length) + 2;
  const urlWidth = Math.max(10, ...subtrees.map((s) => s.url.length)) + 2;

  console.log(
    chalk.dim('  ' +
      'Subtree'.padEnd(nameWidth) +
      'Upstream'.padEnd(upstreamWidth) +
      'Push branch'.padEnd(pushWidth) +
      'Remote URL'.padEnd(urlWidth) +
      'Changed')
  );
  console.log(chalk.dim('  ' + '─'.repeat(nameWidth + upstreamWidth + pushWidth + urlWidth + 10)));

  for (const s of subtrees) {
    const changed = s.changed
      ? chalk.yellow('● yes')
      : chalk.dim('○ no');
    const upstreamStr = chalk.dim((s.upstream || 'unknown').padEnd(upstreamWidth));
    const pushStr = chalk.cyan(currentBranch.padEnd(pushWidth));
    console.log(
      `  ${chalk.bold(s.name.padEnd(nameWidth))}${upstreamStr}${pushStr}${chalk.dim(s.url.padEnd(urlWidth))}${changed}`
    );
  }
  blank();
}

export function dryRun(actions) {
  console.log();
  console.log(`  ${ICON.warn} ${chalk.yellow.bold('Dry run')} — these commands would execute:`);
  console.log();
  for (const action of actions) {
    console.log(`    ${chalk.dim('$')} ${chalk.white(action)}`);
  }
  console.log();
}

export function pushStart(name, branch) {
  console.log(`  ${ICON.rocket} Pushing ${chalk.bold(name)} ${ICON.arrow} ${chalk.cyan(branch)}`);
}

export function pushSlow() {
  info('    Subtree push walks commit history — this may take a moment...');
}

export function initSummary(dir, count) {
  blank();
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log(`  ${ICON.package} ${chalk.green.bold('Monorepo created successfully!')}`);
  console.log(`  ${ICON.folder} Location: ${chalk.white(dir)}`);
  console.log(`  ${ICON.git} Subtrees: ${chalk.white(count)}`);
  blank();
}

export function addSummary(name, url) {
  blank();
  success(`Added ${chalk.bold(name)} from ${chalk.dim(url)}`);
  blank();
}

// ── Help / Usage ───────────────────────────────────────────────────────────────

export function usage() {
  console.log(`
${chalk.bold.cyan('subtree-monorepo')} — create and manage git-subtree monorepos

${chalk.bold('Usage:')}
  subtree-monorepo ${chalk.green('<command>')} [options]

${chalk.bold('Commands:')}
  ${chalk.green('init')} <dir> <repo-url...>    Create a new monorepo from repo URLs
  ${chalk.green('add')}  <repo-url>             Add a repo to the current monorepo
  ${chalk.green('status')}                      Show tracked subtrees and changes
  ${chalk.green('push')} [subtree...]            Push changed subtrees upstream
  ${chalk.green('branch')} [name]               Create a branch on all upstream repos

${chalk.bold('Init options:')}
  --full-history              Import full git history (default: shallow + squash)

${chalk.bold('Add options:')}
  --prefix <name>             Override the subtree directory name
  --full-history              Import full git history

${chalk.bold('Status options:')}
  --json                      Output machine-readable JSON

${chalk.bold('Push options:')}
  --branch <name>             Branch name for upstream push (default: current)
  --dry-run                   Show commands without executing

${chalk.bold('Examples:')}
  ${chalk.dim('# Create monorepo from multiple repos')}
  npx subtree-monorepo init my-monorepo https://github.com/org/api.git https://github.com/org/web.git

  ${chalk.dim('# Add another repo later')}
  cd my-monorepo
  npx subtree-monorepo add https://github.com/org/shared.git

  ${chalk.dim('# Check status')}
  npx subtree-monorepo status

  ${chalk.dim('# Create a branch (used as target when pushing all subtrees)')}
  npx subtree-monorepo branch feature-x

  ${chalk.dim('# Push changes upstream')}
  npx subtree-monorepo push --dry-run
`);
}
