import test from 'node:test';
import assert from 'node:assert/strict';
import { planPullTargets, resolvePullUpstreamBranch, selectPullSubtrees } from '../src/commands/pull.js';

test('selectPullSubtrees returns all tracked subtrees when none are requested', () => {
  const allPrefixes = [{ name: 'api' }, { name: 'web' }];
  assert.deepEqual(selectPullSubtrees(allPrefixes), allPrefixes);
});

test('selectPullSubtrees rejects unknown subtree names', () => {
  assert.throws(
    () => selectPullSubtrees([{ name: 'api' }, { name: 'web' }], ['api', 'worker']),
    /"worker" is not a tracked subtree/
  );
});

test('planPullTargets skips missing branch only when pulling all tracked subtrees', () => {
  const result = planPullTargets({
    allPrefixes: [{ name: 'api' }, { name: 'web' }, { name: 'shared' }],
    branch: 'release/2026-04',
    hasRemoteBranchFn: (remoteName) => remoteName !== 'web',
  });

  assert.deepEqual(result, {
    toPull: [{ name: 'api' }, { name: 'shared' }],
    skipped: [{ name: 'web' }],
  });
});

test('planPullTargets keeps explicit subtree selections even if the branch is missing', () => {
  const result = planPullTargets({
    allPrefixes: [{ name: 'api' }, { name: 'web' }],
    requestedSubtrees: ['api'],
    branch: 'release/2026-04',
    hasRemoteBranchFn: () => false,
  });

  assert.deepEqual(result, {
    toPull: [{ name: 'api' }],
    skipped: [],
  });
});

test('resolvePullUpstreamBranch prefers explicit branch, then tracked branch, then main', () => {
  assert.equal(
    resolvePullUpstreamBranch({ requestedBranch: 'torch-profiler', trackedBranch: 'main' }),
    'torch-profiler'
  );
  assert.equal(resolvePullUpstreamBranch({ requestedBranch: undefined, trackedBranch: 'torch-profiler' }), 'torch-profiler');
  assert.equal(resolvePullUpstreamBranch({ requestedBranch: undefined, trackedBranch: null }), 'main');
});
