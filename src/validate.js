import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { hasSubtreeCommand, isInsideWorkTree, getRemotes, getSubtreePrefixes, extractRepoName } from './git.js';

export function validateGitSubtree() {
  if (!hasSubtreeCommand()) {
    throw new Error(
      'git subtree is not available. It is usually bundled with git — check your git installation.'
    );
  }
}

export function validateUrls(urls) {
  for (const url of urls) {
    const looksValid =
      url.startsWith('https://') ||
      url.startsWith('http://') ||
      url.startsWith('git@') ||
      url.startsWith('ssh://') ||
      url.startsWith('git://');
    if (!looksValid) {
      throw new Error(`Invalid repository URL: ${url}`);
    }
  }
}

export function validateNoDuplicateNames(urls) {
  const names = urls.map((u) => extractRepoName(u));
  const seen = new Set();
  for (const name of names) {
    if (!name) {
      throw new Error(`Could not extract repository name from URL`);
    }
    if (seen.has(name)) {
      throw new Error(
        `Duplicate repository name "${name}". Use different repos or rename before importing.`
      );
    }
    seen.add(name);
  }
}

export function validateInsideMonorepo(cwd) {
  if (!isInsideWorkTree(cwd)) {
    throw new Error(
      'Not inside a git repository. Run this command from a monorepo created with "unirepo init".'
    );
  }
  const prefixes = getSubtreePrefixes(cwd);
  if (prefixes.length === 0) {
    const remotes = getRemotes(cwd);
    if (remotes.length === 0) {
      throw new Error(
        'No remotes found. This does not look like a subtree monorepo.'
      );
    }
  }
}

export function validateNameAvailable(name, cwd) {
  const remotes = getRemotes(cwd);
  if (remotes.some((r) => r.name === name)) {
    throw new Error(`Remote "${name}" already exists. Choose a different prefix or remove the existing remote.`);
  }
  if (existsSync(join(cwd, name))) {
    throw new Error(`Directory "${name}" already exists. Choose a different prefix.`);
  }
}

export function validateReachable(url) {
  try {
    execSync(`git ls-remote --exit-code "${url}" HEAD`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    });
  } catch {
    throw new Error(
      `Cannot reach repository: ${url}\n         Check the URL and your access permissions.`
    );
  }
}

export { extractRepoName } from './git.js';
