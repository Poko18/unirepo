import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatusSubtrees } from '../src/commands/status.js';

test('buildStatusSubtrees resolves per-subtree push branches from config and workspace branch', () => {
  const subtrees = buildStatusSubtrees({
    prefixes: [
      { name: 'api', url: 'https://github.com/org/api.git' },
      { name: 'web', url: 'https://github.com/org/web.git' },
    ],
    changedPrefixes: [{ name: 'web', url: 'https://github.com/org/web.git' }],
    currentBranch: 'feature/auth-flow',
    getTrackedBranchFn: (prefixName) => (prefixName === 'api' ? 'main' : 'develop'),
    getConfiguredPushBranchFn: (prefixName) => (prefixName === 'api' ? 'feature-api' : null),
  });

  assert.deepEqual(subtrees, [
    {
      name: 'api',
      url: 'https://github.com/org/api.git',
      upstream: 'main',
      pushBranch: 'feature-api',
      changed: false,
    },
    {
      name: 'web',
      url: 'https://github.com/org/web.git',
      upstream: 'develop',
      pushBranch: 'feature/auth-flow',
      changed: true,
    },
  ]);
});
