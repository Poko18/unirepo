import { readFileSync } from 'node:fs';
import chalk from 'chalk';

const PACKAGE_JSON = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

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

export function interactiveHeader() {
  console.log();
  console.log(chalk.bold.cyan(`  ${ICON.git}  Unirepo — Interactive setup`));
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log(chalk.dim('  Pick repos to bundle into a new subtree monorepo.'));
  console.log();
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
    info('No subtrees found. Use "unirepo add" to add repos.');
    blank();
    return;
  }

  // Column widths
  const nameWidth = Math.max(12, ...subtrees.map((s) => s.name.length)) + 2;
  const upstreamWidth = Math.max(10, ...subtrees.map((s) => (s.upstream || '').length)) + 2;
  const pushWidth = Math.max(12, currentBranch.length) + 2;
  const urlWidth = Math.max(10, ...subtrees.map((s) => s.url.length)) + 2;
  const headerRow =
    'Subtree'.padEnd(nameWidth) +
    'Upstream'.padEnd(upstreamWidth) +
    'Push branch'.padEnd(pushWidth) +
    'Remote URL'.padEnd(urlWidth) +
    'Changed';

  console.log(chalk.dim(`  ${headerRow}`));
  console.log(chalk.dim('  ' + '─'.repeat(headerRow.length)));

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

export function initSummary(dir, count, subtreeNames) {
  blank();
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log(`  ${ICON.package} ${chalk.green.bold('Monorepo created successfully!')}`);
  console.log(`  ${ICON.folder} Location: ${chalk.white(dir)}`);
  console.log(`  ${ICON.git} Subtrees: ${chalk.white(count)}`);
  blank();
  if (subtreeNames && subtreeNames.length > 0) {
    console.log(chalk.bold('  Next steps:'));
    console.log(`    ${chalk.dim('$')} cd ${dir.includes(' ') ? `"${dir}"` : dir}`);
    console.log(`    ${chalk.dim('$')} unirepo status`);
    console.log(`    ${chalk.dim('# create a branch to target when pushing upstream')}`);
    console.log(`    ${chalk.dim('$')} unirepo branch feature-x`);
    console.log(`    ${chalk.dim('# edit files in')} ${subtreeNames.map(n => chalk.cyan(n + '/')).join(', ')}`);
    console.log(`    ${chalk.dim('$')} git add . && git commit -m "feat: ..."`);
    console.log(`    ${chalk.dim('$')} unirepo push --dry-run`);
    blank();
  }
}

export function addSummary(name, url) {
  blank();
  success(`Added ${chalk.bold(name)} from ${chalk.dim(url)}`);
  blank();
}

export function version() {
  console.log(`unirepo ${PACKAGE_JSON.version}`);
}

// ── Help / Usage ───────────────────────────────────────────────────────────────

export function usage() {
  console.log(`
${chalk.bold.cyan('unirepo')} — create and manage git-subtree monorepos
${chalk.dim(`Version: ${PACKAGE_JSON.version}`)}

${chalk.bold('Usage:')}
  unirepo ${chalk.green('<command>')} [options]

${chalk.bold('Commands:')}
  ${chalk.green('init')} <dir> <repo-url...>    Create a new monorepo from repo URLs
  ${chalk.green('add')}  <repo-url>             Add a repo to the current monorepo
  ${chalk.green('pull')} [subtree...]            Pull subtree updates from upstream
  ${chalk.green('status')}                      Show tracked subtrees and changes
  ${chalk.green('push')} [subtree...]            Push changed subtrees upstream
  ${chalk.green('branch')} [name]               Create a branch on all upstream repos
  ${chalk.green('version')}                     Show the installed CLI version

${chalk.bold('Global options:')}
  --help, -h                  Show help
  --version, -v               Show the installed CLI version

${chalk.bold('Init options:')}
  --full-history              Import full git history (default: shallow + squash)

${chalk.bold('Add options:')}
  --prefix <name>             Override the subtree directory name
  --branch <name>             Import from a specific upstream branch
  --full-history              Import full git history

${chalk.bold('Pull options:')}
  --branch <name>             Pull a specific upstream branch for all selected subtrees
  --full-history              Pull full history instead of squash mode

${chalk.bold('Status options:')}
  --json                      Output machine-readable JSON

${chalk.bold('Push options:')}
  --branch <name>             Branch name for upstream push (default: current)
  --dry-run                   Show commands without executing

${chalk.bold('Examples:')}
  ${chalk.dim('# Create monorepo from multiple repos')}
  npx unirepo init my-monorepo https://github.com/org/api.git https://github.com/org/web.git

  ${chalk.dim('# Add another repo later')}
  cd my-monorepo
  npx unirepo add https://github.com/org/shared.git --branch main

  ${chalk.dim('# Pull upstream updates before working')}
  npx unirepo pull

  ${chalk.dim('# Check status')}
  npx unirepo status

  ${chalk.dim('# Create a branch (used as target when pushing all subtrees)')}
  npx unirepo branch feature-x

  ${chalk.dim('# Push changes upstream')}
  npx unirepo push --dry-run
`);
}
