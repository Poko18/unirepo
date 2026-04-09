import { execSync } from 'node:child_process';

/**
 * Thin wrapper around the `gh` CLI. We shell out rather than hitting the
 * GitHub API directly so we reuse whatever auth the user already has
 * configured (`gh auth login`) — no token juggling.
 */

const REPO_FIELDS = 'nameWithOwner,url,pushedAt,description,isPrivate';
const DEFAULT_LIMIT = 200;
const SEARCH_LIMIT = 30;

function runGh(args, { timeout = 30000 } = {}) {
  try {
    return execSync(`gh ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    });
  } catch (err) {
    const stderr = (err.stderr || '').trim();
    throw new Error(stderr || err.message);
  }
}

function runGhJson(args, opts) {
  const out = runGh(args, opts);
  if (!out.trim()) return [];
  try {
    return JSON.parse(out);
  } catch (err) {
    throw new Error(`Failed to parse gh output: ${err.message}`);
  }
}

/**
 * Check whether `gh` is installed AND the user is authenticated.
 * Returns false (not throws) on either failure so callers can branch cleanly.
 */
export function isGhAvailable() {
  try {
    execSync('gh --version', { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    return false;
  }
  try {
    execSync('gh auth status', { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the authenticated user's login (for display in the source menu).
 * Returns null on failure.
 */
export function getAuthenticatedUser() {
  try {
    const out = runGh('api user --jq .login');
    return out.trim() || null;
  } catch {
    return null;
  }
}

/**
 * List repositories owned by the authenticated user. `gh repo list` returns
 * results roughly in recently-updated order by default (no --sort flag).
 */
export function listPersonalRepos(limit = DEFAULT_LIMIT) {
  return runGhJson(`repo list --json ${REPO_FIELDS} --limit ${limit}`);
}

/**
 * List organizations the authenticated user belongs to.
 * Returns an array of `{ login }` objects.
 */
export function listOrgs() {
  try {
    const out = runGh('api user/orgs --jq "[.[] | {login: .login}]"');
    return JSON.parse(out);
  } catch {
    return [];
  }
}

/**
 * List repositories for a specific organization.
 */
export function listOrgRepos(org, limit = DEFAULT_LIMIT) {
  return runGhJson(`repo list ${org} --json ${REPO_FIELDS} --limit ${limit}`);
}

/**
 * Search GitHub repos by a free-text query.
 */
export function searchRepos(query, limit = SEARCH_LIMIT) {
  // gh search repos uses `url` + `name` + `fullName`, not `nameWithOwner`.
  // Normalize to the same shape the other listers return.
  const fields = 'fullName,url,pushedAt,description,isPrivate';
  const escaped = query.replace(/"/g, '\\"');
  const raw = runGhJson(
    `search repos "${escaped}" --json ${fields} --limit ${limit}`
  );
  return raw.map((r) => ({
    nameWithOwner: r.fullName,
    url: r.url,
    pushedAt: r.pushedAt,
    description: r.description,
    isPrivate: r.isPrivate,
  }));
}
