import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, validateCommandFlags } from '../src/index.js';

test('parseArgs parses version aliases', () => {
  assert.deepEqual(parseArgs(['node', 'cli', '--version']), {
    command: 'version',
    positional: [],
    flags: {},
  });

  assert.deepEqual(parseArgs(['node', 'cli', '-v']), {
    command: 'version',
    positional: [],
    flags: {},
  });

  assert.deepEqual(parseArgs(['node', 'cli', 'version']), {
    command: 'version',
    positional: [],
    flags: {},
  });
});

test('parseArgs handles top-level help and no args', () => {
  assert.deepEqual(parseArgs(['node', 'cli']), {
    command: undefined,
    positional: [],
    flags: { help: true },
  });

  assert.deepEqual(parseArgs(['node', 'cli', '--help']), {
    command: undefined,
    positional: [],
    flags: { help: true },
  });
});

test('parseArgs parses command flags and positional arguments', () => {
  assert.deepEqual(
    parseArgs([
      'node',
      'cli',
      'push',
      'api',
      '--branch',
      'feature/refactor',
      '--dry-run',
    ]),
    {
      command: 'push',
      positional: ['api'],
      flags: {
        branch: 'feature/refactor',
        dryRun: true,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'node',
      'cli',
      'add',
      'https://github.com/org/repo.git',
      '--prefix',
      'custom-name',
      '--full-history',
    ]),
    {
      command: 'add',
      positional: ['https://github.com/org/repo.git'],
      flags: {
        prefix: 'custom-name',
        fullHistory: true,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'node',
      'cli',
      'pull',
      'api',
      'web',
      '--branch',
      'release/2026-04',
      '--full-history',
    ]),
    {
      command: 'pull',
      positional: ['api', 'web'],
      flags: {
        branch: 'release/2026-04',
        fullHistory: true,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'node',
      'cli',
      'pull',
      '--prefix',
      'api',
      '--branch',
      'release/2026-04',
    ]),
    {
      command: 'pull',
      positional: [],
      flags: {
        prefix: 'api',
        branch: 'release/2026-04',
      },
    }
  );

  assert.deepEqual(
    parseArgs(['node', 'cli', 'status', '--json', '--help']),
    {
      command: 'status',
      positional: [],
      flags: {
        json: true,
        help: true,
      },
    }
  );
});

test('validateCommandFlags rejects known flags on the wrong command', () => {
  assert.throws(
    () => validateCommandFlags('status', { prefix: 'api' }),
    /Flag --prefix is not supported for "status"\./
  );

  assert.throws(
    () => validateCommandFlags('push', { json: true }),
    /Flag --json is not supported for "push"\./
  );

  assert.doesNotThrow(() => validateCommandFlags('pull', { prefix: 'api', branch: 'release/2026-04' }));
});
