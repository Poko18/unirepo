#!/usr/bin/env node

import * as ui from './ui.js';
import { runInit } from './commands/init.js';
import { runInteractiveInit, CancelError } from './interactive.js';
import { runAdd } from './commands/add.js';
import { runPull } from './commands/pull.js';
import { runStatus } from './commands/status.js';
import { runPush } from './commands/push.js';
import { runBranch } from './commands/branch.js';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

// ── Argument Parsing ───────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = argv.slice(2); // skip node + script

  if (args[0] === '--version' || args[0] === '-v' || args[0] === 'version') {
    return { command: 'version', positional: [], flags: {} };
  }

  // Handle top-level --help / -h before command
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { command: undefined, positional: [], flags: { help: true } };
  }

  const command = args[0];
  const positional = [];
  const flags = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--full-history') {
      flags.fullHistory = true;
    } else if (arg === '--json') {
      flags.json = true;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--prefix' && i + 1 < args.length) {
      flags.prefix = args[++i];
    } else if (arg === '--branch' && i + 1 < args.length) {
      flags.branch = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg.startsWith('-')) {
      ui.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

// ── Main ───────────────────────────────────────────────────────────────────────

export async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  if (!command || command === 'help' || flags.help) {
    ui.usage();
    process.exit(0);
  }

  switch (command) {
    case 'version': {
      ui.version();
      break;
    }

    case 'init': {
      if (positional.length === 0) {
        // No args → interactive setup flow
        const result = await runInteractiveInit();
        await runInit(result);
        break;
      }
      if (positional.length < 2) {
        ui.error('Usage: unirepo init <dir> <repo-url> [repo-url...]');
        ui.info('Or run "unirepo init" with no arguments for interactive setup.');
        process.exit(1);
      }
      const [dir, ...repos] = positional;
      await runInit({ dir, repos, fullHistory: flags.fullHistory || false });
      break;
    }

    case 'add': {
      if (positional.length < 1) {
        ui.error('Usage: unirepo add <repo-url> [--prefix <name>] [--branch <name>] [--full-history]');
        process.exit(1);
      }
      await runAdd({
        url: positional[0],
        prefix: flags.prefix,
        branch: flags.branch,
        fullHistory: flags.fullHistory || false,
      });
      break;
    }

    case 'pull': {
      await runPull({
        subtrees: positional.length > 0 ? positional : undefined,
        branch: flags.branch,
        fullHistory: flags.fullHistory || false,
      });
      break;
    }

    case 'status': {
      await runStatus({ json: flags.json || false });
      break;
    }

    case 'push': {
      await runPush({
        subtrees: positional.length > 0 ? positional : undefined,
        branch: flags.branch,
        dryRun: flags.dryRun || false,
      });
      break;
    }

    case 'branch': {
      await runBranch({ name: positional[0] });
      break;
    }

    default:
      ui.error(`Unknown command: ${command}`);
      ui.blank();
      ui.usage();
      process.exit(1);
  }
}

// Resolve symlinks so this works when invoked via an npm-installed bin symlink
// (e.g. /usr/local/bin/unirepo → /usr/local/lib/node_modules/unirepo/src/index.js).
function isDirectRunCheck() {
  if (!process.argv[1]) return false;
  try {
    const realArgv = realpathSync(process.argv[1]);
    return import.meta.url === pathToFileURL(realArgv).href;
  } catch {
    return false;
  }
}
const isDirectRun = isDirectRunCheck();

if (isDirectRun) {
  main().catch((err) => {
    if (err instanceof CancelError) {
      ui.blank();
      ui.info(err.message);
      process.exit(0);
    }
    ui.error(err.message);
    process.exit(1);
  });
}
