import test from 'node:test';
import assert from 'node:assert/strict';

// Pure-logic helpers extracted for testability
function resolveResetTargets({ allPrefixes, requestedSubtrees, branch, getTrackedBranch }) {
  let prefixes;
  if (requestedSubtrees && requestedSubtrees.length > 0) {
    const names = new Set(allPrefixes.map((p) => p.name));
    for (const name of requestedSubtrees) {
      if (!names.has(name)) {
        throw new Error(`"${name}" is not a tracked subtree. Run "unirepo status" to see available subtrees.`);
      }
    }
    prefixes = allPrefixes.filter((p) => requestedSubtrees.includes(p.name));
  } else {
    prefixes = allPrefixes;
  }

  return prefixes.map((p) => ({
    ...p,
    upstreamBranch: branch || getTrackedBranch(p.name) || 'main',
  }));
}

test('resolveResetTargets returns all prefixes when none are requested', () => {
  const all = [{ name: 'api', url: 'u' }, { name: 'web', url: 'v' }];
  const targets = resolveResetTargets({
    allPrefixes: all,
    branch: 'main',
    getTrackedBranch: () => 'main',
  });
  assert.equal(targets.length, 2);
  assert.deepEqual(targets.map((t) => t.name), ['api', 'web']);
});

test('resolveResetTargets filters to requested subtrees', () => {
  const all = [{ name: 'api', url: 'u' }, { name: 'web', url: 'v' }, { name: 'shared', url: 'w' }];
  const targets = resolveResetTargets({
    allPrefixes: all,
    requestedSubtrees: ['api', 'shared'],
    branch: 'main',
    getTrackedBranch: () => 'main',
  });
  assert.deepEqual(targets.map((t) => t.name), ['api', 'shared']);
});

test('resolveResetTargets throws for unknown subtree', () => {
  assert.throws(
    () =>
      resolveResetTargets({
        allPrefixes: [{ name: 'api' }, { name: 'web' }],
        requestedSubtrees: ['api', 'missing'],
        getTrackedBranch: () => 'main',
      }),
    /"missing" is not a tracked subtree/
  );
});

test('resolveResetTargets uses explicit branch over tracked branch', () => {
  const targets = resolveResetTargets({
    allPrefixes: [{ name: 'api' }],
    branch: 'release/2026-04',
    getTrackedBranch: () => 'main',
  });
  assert.equal(targets[0].upstreamBranch, 'release/2026-04');
});

test('resolveResetTargets falls back to tracked branch then main', () => {
  const t1 = resolveResetTargets({
    allPrefixes: [{ name: 'api' }],
    getTrackedBranch: () => 'develop',
  });
  assert.equal(t1[0].upstreamBranch, 'develop');

  const t2 = resolveResetTargets({
    allPrefixes: [{ name: 'api' }],
    getTrackedBranch: () => null,
  });
  assert.equal(t2[0].upstreamBranch, 'main');
});
