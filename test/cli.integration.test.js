import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI_PATH = fileURLToPath(new URL('../src/index.js', import.meta.url));

function runCli(args) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
  });

  return {
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
  };
}

test('cli --version exits with code 0 and prints package name', () => {
  const result = runCli(['--version']);
  assert.equal(result.status, 0);
  assert.match(result.output, /unirepo\s+\d+\.\d+\.\d+/);
});

test('cli --help exits with code 0 and shows usage', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.output, /Usage:/);
  assert.match(result.output, /pull/);
});

test('cli unknown command fails with code 1 and guidance', () => {
  const result = runCli(['unknown-command']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Unknown command: unknown-command/);
  assert.match(result.output, /Usage:/);
});

test('cli unknown flag fails with code 1', () => {
  const result = runCli(['add', '--nope']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Unknown flag: --nope/);
});

test('cli add command without repo url fails with code 1 and usage', () => {
  const result = runCli(['add']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Usage: unirepo add <repo-url>/);
});

test('cli pull rejects mixing subtree arguments and --prefix', () => {
  const result = runCli(['pull', 'api', '--prefix', 'web']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Use either subtree arguments or --prefix, not both\./);
});

test('cli status rejects --prefix because it is not a status flag', () => {
  const result = runCli(['status', '--prefix', 'api']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Flag --prefix is not supported for "status"\./);
  assert.match(result.output, /Usage: unirepo status \[--json\]/);
});

test('cli push rejects --json because it is not a push flag', () => {
  const result = runCli(['push', '--json']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Flag --json is not supported for "push"\./);
  assert.match(result.output, /Usage: unirepo push \[subtree\.\.\.\] \[--branch <name>\] \[--dry-run\]/);
});

test('cli pr without title fails with code 1 and usage', () => {
  const result = runCli(['pr']);
  assert.equal(result.status, 1);
  assert.match(result.output, /Usage: unirepo pr \[subtree\.\.\.\] --title <title>/);
  assert.match(result.output, /Provide a shared PR title with --title\./);
});

// Regression test for the symlink bug: when installed globally via npm,
// the CLI is invoked through a symlink (e.g. /usr/local/bin/unirepo).
// The isDirectRun check must resolve symlinks, otherwise main() never runs
// and the CLI silently exits with no output.
test('cli works when invoked via a symlink (npm global install scenario)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'unirepo-symlink-'));
  const linkPath = join(tmp, 'unirepo-link');
  try {
    symlinkSync(CLI_PATH, linkPath);
    const result = spawnSync(process.execPath, [linkPath, '--version'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0);
    assert.match(`${result.stdout || ''}${result.stderr || ''}`, /unirepo\s+\d+\.\d+\.\d+/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
