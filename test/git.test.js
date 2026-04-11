import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  getConfiguredSubtreeBranch,
  getTrackedSubtreeBranch,
  setConfiguredSubtreeBranch,
} from '../src/git.js';

test('subtree branch config persists and is used as tracked branch', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'unirepo-git-config-'));

  try {
    execSync('git init', { cwd, stdio: 'pipe' });
    setConfiguredSubtreeBranch(cwd, 'CCMC', 'torch-profiler');

    assert.equal(getConfiguredSubtreeBranch(cwd, 'CCMC'), 'torch-profiler');
    assert.equal(getTrackedSubtreeBranch(cwd, 'CCMC'), 'torch-profiler');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
