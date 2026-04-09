import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
