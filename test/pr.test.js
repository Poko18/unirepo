import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPrSubtrees, resolvePrBaseBranch, planPrTargets } from '../src/commands/pr.js';

test('selectPrSubtrees returns changed subtrees when no explicit selection is given', () => {
  const allPrefixes = [{ name: 'api' }, { name: 'web' }, { name: 'shared' }];
  const changedPrefixes = [{ name: 'api' }, { name: 'shared' }];

  assert.deepEqual(selectPrSubtrees(allPrefixes, changedPrefixes), changedPrefixes);
});

test('selectPrSubtrees rejects unknown subtree names', () => {
  assert.throws(
    () => selectPrSubtrees([{ name: 'api' }, { name: 'web' }], [{ name: 'api' }], ['worker']),
    /"worker" is not a tracked subtree/
  );
});

test('resolvePrBaseBranch prefers explicit branch, then tracked branch, then main', () => {
  assert.equal(
    resolvePrBaseBranch({ requestedBase: 'release/2026-04', trackedBranch: 'main' }),
    'release/2026-04'
  );
  assert.equal(resolvePrBaseBranch({ requestedBase: undefined, trackedBranch: 'develop' }), 'develop');
  assert.equal(resolvePrBaseBranch({ requestedBase: undefined, trackedBranch: null }), 'main');
});

test('planPrTargets maps subtree metadata to repo, base, and head branches', () => {
  const targets = planPrTargets({
    allPrefixes: [
      { name: 'api', url: 'https://github.com/org/api.git' },
      { name: 'web', url: 'https://github.com/org/web.git' },
    ],
    changedPrefixes: [
      { name: 'api', url: 'https://github.com/org/api.git' },
      { name: 'web', url: 'https://github.com/org/web.git' },
    ],
    currentBranch: 'feature/auth-flow',
    requestedBase: undefined,
    requestedHead: undefined,
    getTrackedBranchFn: (prefixName) => (prefixName === 'api' ? 'main' : 'develop'),
    getConfiguredPushBranchFn: (prefixName) => (prefixName === 'web' ? 'feature/web-auth-flow' : null),
    getRepoSlugFn: (url) => url.replace('https://github.com/', '').replace(/\.git$/, ''),
  });

  assert.deepEqual(targets, [
    {
      name: 'api',
      repo: 'org/api',
      url: 'https://github.com/org/api.git',
      base: 'main',
      head: 'feature/auth-flow',
    },
    {
      name: 'web',
      repo: 'org/web',
      url: 'https://github.com/org/web.git',
      base: 'develop',
      head: 'feature/web-auth-flow',
    },
  ]);
});

test('planPrTargets lets explicit head override configured subtree push branches', () => {
  const targets = planPrTargets({
    allPrefixes: [{ name: 'api', url: 'https://github.com/org/api.git' }],
    changedPrefixes: [{ name: 'api', url: 'https://github.com/org/api.git' }],
    currentBranch: 'feature/auth-flow',
    requestedBase: undefined,
    requestedHead: 'release/auth-hotfix',
    getTrackedBranchFn: () => 'main',
    getConfiguredPushBranchFn: () => 'feature/api-auth-flow',
    getRepoSlugFn: (url) => url.replace('https://github.com/', '').replace(/\.git$/, ''),
  });

  assert.deepEqual(targets, [
    {
      name: 'api',
      repo: 'org/api',
      url: 'https://github.com/org/api.git',
      base: 'main',
      head: 'release/auth-hotfix',
    },
  ]);
});
