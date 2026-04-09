import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUrls, validateNoDuplicateNames, extractRepoName } from '../src/validate.js';

test('validateUrls accepts supported url schemes', () => {
  assert.doesNotThrow(() => {
    validateUrls([
      'https://github.com/org/repo.git',
      'http://example.com/repo.git',
      'git@github.com:org/repo.git',
      'ssh://git@github.com/org/repo.git',
      'git://github.com/org/repo.git',
    ]);
  });
});

test('validateUrls rejects invalid urls', () => {
  assert.throws(() => validateUrls(['ftp://example.com/repo.git']), /Invalid repository URL/);
  assert.throws(() => validateUrls(['./local/path/repo']), /Invalid repository URL/);
});

test('validateNoDuplicateNames rejects duplicate repo names', () => {
  assert.throws(
    () =>
      validateNoDuplicateNames([
        'https://github.com/org/service.git',
        'git@github.com:another-org/service.git',
      ]),
    /Duplicate repository name "service"/
  );
});

test('validateNoDuplicateNames accepts unique repo names', () => {
  assert.doesNotThrow(() => {
    validateNoDuplicateNames([
      'https://github.com/org/api.git',
      'https://github.com/org/web.git',
    ]);
  });
});

test('extractRepoName handles common git url variants', () => {
  assert.equal(extractRepoName('https://github.com/org/repo.git'), 'repo');
  assert.equal(extractRepoName('https://github.com/org/repo/'), 'repo');
  assert.equal(extractRepoName('git@github.com:org/repo.git'), 'repo');
  assert.equal(extractRepoName('ssh://git@github.com/org/repo.git'), 'repo');
});
