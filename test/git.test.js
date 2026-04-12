import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  getConfiguredSubtreeBranch,
  getConfiguredSubtreePushBranch,
  getTrackedSubtreeBranch,
  resolveSubtreePushBranch,
  setConfiguredSubtreeBranch,
  setConfiguredSubtreePushBranch,
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

test('subtree push branch config persists independently from tracked branch config', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'unirepo-git-push-config-'));

  try {
    execSync('git init', { cwd, stdio: 'pipe' });
    setConfiguredSubtreeBranch(cwd, 'api', 'main');
    setConfiguredSubtreePushBranch(cwd, 'api', 'feature-api');

    assert.equal(getConfiguredSubtreeBranch(cwd, 'api'), 'main');
    assert.equal(getTrackedSubtreeBranch(cwd, 'api'), 'main');
    assert.equal(getConfiguredSubtreePushBranch(cwd, 'api'), 'feature-api');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('resolveSubtreePushBranch prefers explicit branch, then configured branch, then current branch', () => {
  assert.equal(
    resolveSubtreePushBranch({
      requestedBranch: 'release/api-fix',
      configuredBranch: 'feature-api',
      currentBranch: 'feature/all',
    }),
    'release/api-fix'
  );
  assert.equal(
    resolveSubtreePushBranch({
      requestedBranch: undefined,
      configuredBranch: 'feature-api',
      currentBranch: 'feature/all',
    }),
    'feature-api'
  );
  assert.equal(
    resolveSubtreePushBranch({
      requestedBranch: undefined,
      configuredBranch: null,
      currentBranch: 'feature/all',
    }),
    'feature/all'
  );
});
