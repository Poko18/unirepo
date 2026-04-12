import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function quoteShellArg(value) {
  return JSON.stringify(value);
}

function getSubtreeBranchConfigKey(prefixName) {
  return `unirepo.subtree.${prefixName}.branch`;
}

function getSubtreePushBranchConfigKey(prefixName) {
  return `unirepo.subtree.${prefixName}.pushBranch`;
}

/**
 * Execute a git command and return trimmed stdout.
 * @param {string} args - git arguments
 * @param {object} opts - { cwd, silent, allowFailure }
 * @returns {string} stdout
 */
export function git(args, opts = {}) {
  const { cwd, silent = false, allowFailure = false } = opts;
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'inherit'],
    }).trim();
  } catch (err) {
    if (allowFailure) return '';
    // Surface git's stderr so users can see what actually went wrong
    const stderr = (err.stderr || '').trim();
    const msg = stderr || err.message;
    throw new Error(msg);
  }
}

/**
 * Execute a git command and return output as array of lines.
 */
export function gitLines(args, opts = {}) {
  const out = git(args, { ...opts, silent: true });
  if (!out) return [];
  return out.split('\n').filter(Boolean);
}

/**
 * Check if cwd is inside a git work tree.
 */
export function isInsideWorkTree(cwd) {
  try {
    const result = execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return result === 'true';
  } catch {
    return false;
  }
}

/**
 * Get the current branch name.
 */
export function getCurrentBranch(cwd) {
  return git('rev-parse --abbrev-ref HEAD', { cwd, silent: true });
}

/**
 * Parse `git remote -v` into [{ name, url }] (fetch entries only).
 */
export function getRemotes(cwd) {
  const lines = gitLines('remote -v', { cwd });
  const remotes = [];
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)$/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      remotes.push({ name: match[1], url: match[2] });
    }
  }
  return remotes;
}

/**
 * Detect the default branch of a remote repo via ls-remote.
 * Falls back to 'main' if detection fails.
 */
export function detectDefaultBranch(url) {
  try {
    const output = execSync(`git ls-remote --symref "${url}" HEAD`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
    const match = output.match(/ref:\s+refs\/heads\/(\S+)/);
    if (match) return match[1];
  } catch {
    // fall through
  }
  return 'main';
}

/**
 * Check if `git subtree` command is available.
 */
export function hasSubtreeCommand() {
  try {
    // `git subtree` with no args prints usage and exits non-zero,
    // but that still means it's available. A missing command would
    // throw with a different error (e.g. "is not a git command").
    execSync('git subtree 2>&1', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    return true;
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    // If the output contains usage info, subtree is available
    if (output.includes('git subtree')) return true;
    return false;
  }
}

/**
 * List top-level directories that match a remote name (i.e. are subtree prefixes).
 */
export function getSubtreePrefixes(cwd) {
  const remotes = getRemotes(cwd);
  const remoteNames = new Set(remotes.map((r) => r.name));
  const prefixes = [];
  try {
    const entries = readdirSync(cwd);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = join(cwd, entry);
      try {
        if (statSync(full).isDirectory() && remoteNames.has(entry)) {
          const remote = remotes.find((r) => r.name === entry);
          prefixes.push({ name: entry, url: remote?.url || '' });
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    // empty
  }
  return prefixes;
}

/**
 * Find the SHA of the last subtree add/pull merge commit for a given prefix.
 * Subtree merges have messages like "Merge commit '...' as '<prefix>'" or
 * "Merge commit '...' into ...".
 */
function findLastSubtreeMerge(cwd, prefixName) {
  // Look for the merge commit that added/updated this subtree
  const lines = execSync(
    `git log --merges --format=%H -- "${prefixName}"`,
    { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
  if (!lines) return null;
  // The first (most recent) merge commit touching this prefix
  return lines.split('\n')[0].trim();
}

/**
 * Get subtree prefixes that have changes (uncommitted or committed since last subtree merge).
 */
export function getChangedSubtrees(cwd) {
  const prefixes = getSubtreePrefixes(cwd);
  const changed = [];

  for (const prefix of prefixes) {
    // Check 1: uncommitted/unstaged changes in the working tree
    let hasUncommitted = false;
    try {
      execSync(`git diff --quiet -- "${prefix.name}"`, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // Also check staged but not yet committed
      execSync(`git diff --quiet --cached -- "${prefix.name}"`, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      hasUncommitted = true;
    }

    if (hasUncommitted) {
      changed.push(prefix);
      continue;
    }

    // Check 2: committed changes since the last subtree add/pull merge
    try {
      const mergeCommit = findLastSubtreeMerge(cwd, prefix.name);
      if (mergeCommit) {
        // Are there any commits after the merge that touch this prefix?
        const commits = execSync(
          `git log --oneline "${mergeCommit}..HEAD" -- "${prefix.name}"`,
          { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();
        if (commits) {
          changed.push(prefix);
        }
      }
    } catch {
      // If we can't determine, don't mark as changed
    }
  }
  return changed;
}

/**
 * Get the upstream default branch for a remote (from the fetched tracking refs).
 * Returns the branch name or null if not found.
 */
export function getRemoteBranch(cwd, remoteName) {
  try {
    const headRef = execSync(`git symbolic-ref --quiet --short "refs/remotes/${remoteName}/HEAD"`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (headRef) {
      const slash = headRef.indexOf('/');
      return slash >= 0 ? headRef.slice(slash + 1) : headRef;
    }
  } catch {
    // fall through
  }

  try {
    const refs = execSync(`git for-each-ref --format="%(refname:short)" "refs/remotes/${remoteName}"`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!refs) return null;

    const branches = refs
      .split('\n')
      .map((ref) => ref.trim())
      .filter(Boolean)
      .map((ref) => {
        const slash = ref.indexOf('/');
        return slash >= 0 ? ref.slice(slash + 1) : ref;
      })
      .filter((ref) => ref !== 'HEAD');

    if (branches.length === 0) {
      return null;
    }

    if (branches.includes('main')) return 'main';
    if (branches.includes('master')) return 'master';
    return branches[0];
  } catch {
    return null;
  }
}

/**
 * Get the branch explicitly tracked for a subtree in local git config.
 */
export function getConfiguredSubtreeBranch(cwd, prefixName) {
  const branch = git(`config --get ${quoteShellArg(getSubtreeBranchConfigKey(prefixName))}`, {
    cwd,
    silent: true,
    allowFailure: true,
  });
  return branch || null;
}

/**
 * Persist the branch currently tracked for a subtree in local git config.
 */
export function setConfiguredSubtreeBranch(cwd, prefixName, branch) {
  git(
    `config ${quoteShellArg(getSubtreeBranchConfigKey(prefixName))} ${quoteShellArg(branch)}`,
    { cwd, silent: true }
  );
}

/**
 * Get the push/head branch explicitly configured for a subtree in local git config.
 */
export function getConfiguredSubtreePushBranch(cwd, prefixName) {
  const branch = git(`config --get ${quoteShellArg(getSubtreePushBranchConfigKey(prefixName))}`, {
    cwd,
    silent: true,
    allowFailure: true,
  });
  return branch || null;
}

/**
 * Persist the push/head branch override for a subtree in local git config.
 */
export function setConfiguredSubtreePushBranch(cwd, prefixName, branch) {
  git(
    `config ${quoteShellArg(getSubtreePushBranchConfigKey(prefixName))} ${quoteShellArg(branch)}`,
    { cwd, silent: true }
  );
}

/**
 * Resolve the effective push/head branch for a subtree.
 */
export function resolveSubtreePushBranch({ requestedBranch, configuredBranch, currentBranch }) {
  return requestedBranch || configuredBranch || currentBranch;
}

/**
 * Get the branch unirepo should treat as the subtree's upstream branch.
 */
export function getTrackedSubtreeBranch(cwd, prefixName) {
  return getConfiguredSubtreeBranch(cwd, prefixName) || getRemoteBranch(cwd, prefixName);
}

/**
 * Check whether a remote has a specific branch.
 */
export function hasRemoteBranch(cwd, remoteName, branch) {
  try {
    execSync(`git ls-remote --exit-code --heads "${remoteName}" "${branch}"`, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the working tree has uncommitted (staged or unstaged) changes.
 */
export function hasUncommittedChanges(cwd) {
  try {
    execSync('git diff --quiet', { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    execSync('git diff --quiet --cached', { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    return false;
  } catch {
    return true;
  }
}

/**
 * Extract repo name from URL (basename without .git suffix).
 */
export function extractRepoName(url) {
  const base = url.replace(/\/$/, '').split('/').pop() || '';
  return base.replace(/\.git$/, '');
}
