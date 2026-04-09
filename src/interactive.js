import { input, select, confirm, Separator } from '@inquirer/prompts';
import {
  createPrompt,
  useState,
  useKeypress,
  usePagination,
  usePrefix,
  makeTheme,
  isUpKey,
  isDownKey,
  isEnterKey,
} from '@inquirer/core';
import chalk from 'chalk';
import * as ui from './ui.js';
import * as gh from './github.js';
import { validateUrls, validateReachable } from './validate.js';
import { extractRepoName } from './git.js';

/**
 * Sentinel thrown when the user cancels the flow (Ctrl+C, "Cancel" choice,
 * or answering "no" at the final confirm). Caught by index.js so we exit
 * quietly instead of printing a stack trace.
 */
export class CancelError extends Error {
  constructor(message = 'Setup cancelled.') {
    super(message);
    this.name = 'CancelError';
  }
}

/**
 * Entry point for `unirepo init` when no positional args are given.
 */
export async function runInteractiveInit() {
  ui.interactiveHeader();

  const ghOk = gh.isGhAvailable();
  const user = ghOk ? gh.getAuthenticatedUser() : null;
  const orgs = ghOk ? safeListOrgs() : [];

  if (!ghOk) {
    ui.warning('GitHub CLI (gh) not detected or not authenticated.');
    ui.info('Install: https://cli.github.com/   then run: gh auth login');
    ui.info('Falling back to manual URL entry.');
    ui.blank();
  }

  /** @type {Map<string, {nameWithOwner: string, url: string, isPrivate?: boolean}>} */
  const selected = new Map();

  try {
    while (true) {
      const action = await select({
        message: 'Add repos from',
        choices: buildSourceMenu({ ghOk, user, orgs, count: selected.size }),
        pageSize: 10,
      });

      if (action === 'done') break;
      if (action === 'cancel') throw new CancelError();

      if (action === 'personal') {
        await pickFromSource(
          () => gh.listPersonalRepos(),
          `Personal repos (@${user || 'you'})`,
          selected,
        );
      } else if (action === 'orgs') {
        const org = await pickOrg(orgs);
        if (org) {
          await pickFromSource(
            () => gh.listOrgRepos(org),
            `${org} repos`,
            selected,
          );
        }
      } else if (action === 'search') {
        await searchFlow(selected);
      } else if (action === 'paste') {
        await pasteUrlLoop(selected);
      }
    }

    if (selected.size === 0) {
      throw new CancelError('No repos selected.');
    }

    ui.blank();
    const fullHistory = await confirm({
      message: 'Import full history? (slower, larger clone)',
      default: false,
    });

    const firstRepo = selected.values().next().value;
    const defaultDir = suggestDir(firstRepo);
    const dir = await input({
      message: 'Workspace directory name',
      default: defaultDir,
      validate: (v) => (v && v.trim() ? true : 'Required'),
    });

    ui.blank();
    reviewSummary(dir.trim(), [...selected.values()], fullHistory);
    const ok = await confirm({ message: 'Proceed?', default: true });
    if (!ok) throw new CancelError();

    return {
      dir: dir.trim(),
      repos: [...selected.keys()],
      fullHistory,
    };
  } catch (err) {
    if (err && (err.name === 'ExitPromptError' || err instanceof CancelError)) {
      throw new CancelError(err.message || 'Setup cancelled.');
    }
    throw err;
  }
}

// ── Source menu ─────────────────────────────────────────────────────────────

function buildSourceMenu({ ghOk, user, orgs, count }) {
  const choices = [];
  if (ghOk) {
    choices.push({
      name: `Personal${user ? ` (@${user})` : ''}`,
      value: 'personal',
    });
    if (orgs.length > 0) {
      choices.push({
        name: `Organizations (${orgs.length})  →`,
        value: 'orgs',
      });
    }
    choices.push({ name: 'Search GitHub…', value: 'search' });
  }
  choices.push({ name: 'Paste URL', value: 'paste' });

  choices.push(new Separator());
  if (count > 0) {
    choices.push({ name: `${chalk.green('✔')} Done (${count} selected)`, value: 'done' });
  }
  choices.push({ name: `${chalk.red('✖')} Cancel`, value: 'cancel' });
  return choices;
}

// ── Custom toggle-list prompt ───────────────────────────────────────────────
//
// @inquirer/prompts' built-in checkbox hardcodes space=toggle / enter=submit
// and prints a summary line on every resolution, which is why a `select`-in-
// a-loop implementation left trails of `[x] repo` ghost lines behind. A
// single custom prompt built on @inquirer/core keeps everything on one
// persistent frame: enter toggles, esc returns, hint sits below the list.

const repoToggleList = createPrompt((config, done) => {
  const { message, items: initialItems, pageSize = 15 } = config;
  const theme = makeTheme(config.theme);
  const prefix = usePrefix({ theme });

  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState('idle');

  useKeypress((key) => {
    if (status === 'done') return;
    if (isUpKey(key)) {
      setCursor(cursor > 0 ? cursor - 1 : items.length - 1);
    } else if (isDownKey(key)) {
      setCursor(cursor < items.length - 1 ? cursor + 1 : 0);
    } else if (isEnterKey(key)) {
      const next = items.map((it, i) =>
        i === cursor ? { ...it, checked: !it.checked } : it,
      );
      setItems(next);
    } else if (key.name === 'escape') {
      setStatus('done');
      done(items.filter((it) => it.checked).map((it) => it.value));
    }
  });

  const page = usePagination({
    items,
    active: cursor,
    renderItem: ({ item, isActive }) => {
      const box = item.checked ? chalk.green('[x]') : chalk.dim('[ ]');
      const priv = item.isPrivate ? chalk.dim(' [private]') : '';
      const line = `${box} ${item.nameWithOwner}${priv}`;
      return isActive ? chalk.cyan(`❯ ${line}`) : `  ${line}`;
    },
    pageSize,
    loop: false,
  });

  const count = items.filter((it) => it.checked).length;
  const countText = chalk.dim(`(${count} selected)`);

  if (status === 'done') {
    // Single residual line — no ghost spam.
    return `${prefix} ${chalk.bold(message)} ${countText}`;
  }

  const header = `${prefix} ${chalk.bold(message)} ${countText}`;
  const hint = chalk.dim('  ↑↓ navigate • ⏎ toggle • esc back');
  return [`${header}\n${page}`, hint];
});

// ── Pickers ─────────────────────────────────────────────────────────────────

async function pickFromSource(fetcher, label, selected) {
  let repos;
  try {
    ui.info(`Fetching ${label}…`);
    repos = fetcher();
  } catch (err) {
    ui.error(`Could not fetch ${label}: ${err.message}`);
    return;
  }
  if (!repos || repos.length === 0) {
    ui.warning(`No repos found in ${label}.`);
    return;
  }
  await runToggleList(label, repos, selected);
}

async function runToggleList(label, repos, selected) {
  const items = repos.map((r) => ({
    ...r,
    checked: selected.has(r.url),
    value: r.url,
  }));

  const picked = await repoToggleList({
    message: label,
    items,
    pageSize: 15,
  });

  const sourceUrls = new Set(repos.map((r) => r.url));
  const pickedSet = new Set(picked);
  for (const url of sourceUrls) {
    if (pickedSet.has(url)) {
      const repo = repos.find((r) => r.url === url);
      selected.set(url, repo);
    } else if (selected.has(url)) {
      selected.delete(url);
    }
  }
}

async function pickOrg(orgs) {
  if (orgs.length === 0) {
    ui.warning('You are not a member of any organizations.');
    return null;
  }
  return select({
    message: 'Choose an organization',
    choices: orgs.map((o) => ({ name: o.login, value: o.login })),
    pageSize: 12,
  });
}

async function searchFlow(selected) {
  const query = await input({
    message: 'Search GitHub repos',
    validate: (v) => (v && v.trim().length >= 2 ? true : 'Enter at least 2 characters'),
  });
  let results;
  try {
    ui.info(`Searching for "${query}"…`);
    results = gh.searchRepos(query.trim());
  } catch (err) {
    ui.error(`Search failed: ${err.message}`);
    return;
  }
  if (!results || results.length === 0) {
    ui.warning('No results.');
    return;
  }
  await runToggleList(`Results for "${query}"`, results, selected);
}

async function pasteUrlLoop(selected) {
  while (true) {
    const url = await input({
      message: 'Repo URL (https:// or git@)',
      validate: (v) => {
        if (!v || !v.trim()) return 'Required';
        try {
          validateUrls([v.trim()]);
          return true;
        } catch (err) {
          return err.message;
        }
      },
    });
    const trimmed = url.trim();

    try {
      ui.info('Checking reachability…');
      validateReachable(trimmed);
    } catch (err) {
      ui.error(err.message.split('\n')[0]);
      const retry = await confirm({ message: 'Try another URL?', default: true });
      if (!retry) return;
      continue;
    }

    const name = extractRepoName(trimmed);
    selected.set(trimmed, { nameWithOwner: name, url: trimmed });
    ui.success(`Added ${name}`);

    const more = await confirm({ message: 'Add another URL?', default: false });
    if (!more) return;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function suggestDir(firstRepo) {
  if (!firstRepo) return 'my-monorepo';
  const base = firstRepo.nameWithOwner
    ? firstRepo.nameWithOwner.split('/').pop()
    : extractRepoName(firstRepo.url);
  return `${base}-mono`;
}

function safeListOrgs() {
  try {
    return gh.listOrgs();
  } catch {
    return [];
  }
}

function reviewSummary(dir, repos, fullHistory) {
  console.log(chalk.bold(`  Review (${repos.length} repo${repos.length === 1 ? '' : 's'} → ./${dir})`));
  for (const r of repos) {
    const mode = fullHistory ? chalk.dim('(full history)') : chalk.dim('(shallow)');
    console.log(`    ${chalk.cyan(r.nameWithOwner || extractRepoName(r.url))} ${mode}`);
  }
  console.log();
}
