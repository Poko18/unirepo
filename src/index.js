#!/usr/bin/env node

import * as ui from './ui.js';
import { runInit } from './commands/init.js';
import { runAdd } from './commands/add.js';
import { runStatus } from './commands/status.js';
import { runPush } from './commands/push.js';
import { runBranch } from './commands/branch.js';

// ── Argument Parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2); // skip node + script

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

async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  if (!command || command === 'help' || flags.help) {
    ui.usage();
    process.exit(0);
  }

  switch (command) {
    case 'init': {
      if (positional.length < 2) {
        ui.error('Usage: subtree-monorepo init <dir> <repo-url> [repo-url...]');
        process.exit(1);
      }
      const [dir, ...repos] = positional;
      await runInit({ dir, repos, fullHistory: flags.fullHistory || false });
      break;
    }

    case 'add': {
      if (positional.length < 1) {
        ui.error('Usage: subtree-monorepo add <repo-url> [--prefix <name>] [--full-history]');
        process.exit(1);
      }
      await runAdd({
        url: positional[0],
        prefix: flags.prefix,
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

main().catch((err) => {
  ui.error(err.message);
  process.exit(1);
});
