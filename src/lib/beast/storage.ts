// Beast Storage — the persistence allowance.
//   file   (default, zero-config): everything under BEAST_DATA_DIR, exactly like v2.
//   github (opt-in via BEAST_GH_TOKEN): the app CREATES a repository per finished
//          site — named beast-site-<slug>-<seed6> — and pushes pages, assets,
//          values, licence, attribution and design notes in ONE commit via the
//          Git Data API (blobs → tree → commit → ref). No git binary, no DB.
//   A real database remains an optional future driver behind this same interface.
//
// Owner's question, answered in code: a database is NOT needed to run the
// studio. GitHub is the durable archive; the small runtime state file is the
// only local dependency.

const GH_API = 'https://api.github.com';

export function ghToken(): string | null {
  return process.env.BEAST_GH_TOKEN || process.env.GITHUB_TOKEN || null;
}

export function githubConfigured(): boolean {
  return ghToken() !== null;
}

type GhFile = { path: string; content: string; encoding?: 'utf8' | 'base64' };

async function gh<T = unknown>(path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<{ status: number; data: T | null; etag?: string }> {
  const token = ghToken();
  if (!token) return { status: 401, data: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(GH_API + path, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'BeastWebDeveloper/3.0',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
    clearTimeout(timer);
    const text = await res.text();
    let data: T | null = null;
    try { data = text ? (JSON.parse(text) as T) : null; } catch { data = null; }
    return { status: res.status, data, etag: res.headers.get('etag') ?? undefined };
  } catch {
    return { status: 0, data: null };
  }
}

let ownerCache: { login: string; at: number } | null = null;

export async function ghOwner(): Promise<string | null> {
  if (ownerCache && Date.now() - ownerCache.at < 600_000) return ownerCache.login;
  const { status, data } = await gh<{ login?: string }>('/user');
  if (status !== 200 || !data?.login) return null;
  ownerCache = { login: data.login, at: Date.now() };
  return data.login;
}

/** Create the repo if missing; idempotent (422 = already exists → fetch it). */
export async function ensureRepo(name: string, description: string): Promise<{ ok: boolean; fullName?: string; url?: string; reason?: string }> {
  const owner = await ghOwner();
  if (!owner) return { ok: false, reason: 'no-token-or-owner' };
  const created = await gh<{ full_name?: string; html_url?: string }>(`/user/repos`, {
    method: 'POST',
    body: JSON.stringify({ name, description, private: false, has_issues: false, has_wiki: false, auto_init: false }),
  });
  if (created.status === 201 && created.data?.full_name) {
    return { ok: true, fullName: created.data.full_name, url: created.data.html_url };
  }
  if (created.status === 422 || created.status === 409) {
    const existing = await gh<{ full_name?: string; html_url?: string }>(`/repos/${owner}/${name}`);
    if (existing.status === 200 && existing.data?.full_name) {
      return { ok: true, fullName: existing.data.full_name, url: existing.data.html_url };
    }
    return { ok: false, reason: `repo-lookup-${existing.status}` };
  }
  return { ok: false, reason: `create-${created.status}` };
}

/**
 * Push files as ONE commit (Git Data API):
 *   blobs → tree → commit (parents = current main or none) → create/update ref.
 * Idempotent: re-publishing adds a new commit on top; it never forks.
 */
export async function pushFilesToRepo(
  fullName: string,
  files: GhFile[],
  message: string
): Promise<{ ok: boolean; commitUrl?: string; reason?: string }> {
  if (!files.length) return { ok: false, reason: 'no-files' };
  const refRes = await gh<{ object?: { sha?: string } }>(`/repos/${fullName}/git/ref/heads/main`);
  const parentSha = refRes.status === 200 ? refRes.data?.object?.sha ?? null : null;

  const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  for (const f of files) {
    const encoding = f.encoding ?? 'utf8';
    const blob = await gh<{ sha?: string }>(`/repos/${fullName}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: encoding === 'base64' ? f.content : Buffer.from(f.content, 'utf8').toString('base64'), encoding: 'base64' }),
    });
    if (blob.status !== 201 || !blob.data?.sha) return { ok: false, reason: `blob-${blob.status}` };
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.data.sha });
  }

  const treeRes = await gh<{ sha?: string }>(`/repos/${fullName}/git/trees`, {
    method: 'POST',
    body: JSON.stringify(parentSha ? { base_tree: parentSha, tree } : { tree }),
  });
  if (treeRes.status !== 201 || !treeRes.data?.sha) return { ok: false, reason: `tree-${treeRes.status}` };

  const commitRes = await gh<{ sha?: string; html_url?: string }>(`/repos/${fullName}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: treeRes.data.sha, parents: parentSha ? [parentSha] : [] }),
  });
  if (commitRes.status !== 201 || !commitRes.data?.sha) return { ok: false, reason: `commit-${commitRes.status}` };

  if (parentSha) {
    const upd = await gh(`/repos/${fullName}/git/refs/heads/main`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitRes.data.sha, force: false }),
    });
    if (upd.status !== 200) return { ok: false, reason: `ref-${upd.status}` };
  } else {
    const mk = await gh(`/repos/${fullName}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'refs/heads/main', sha: commitRes.data.sha }),
    });
    if (mk.status !== 201) return { ok: false, reason: `ref-${mk.status}` };
  }
  return { ok: true, commitUrl: commitRes.data.html_url };
}

export function siteRepoName(brand: string, seed: string): string {
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'site';
  return `beast-site-${slug}-${seed.slice(0, 6)}`;
}

export const VAULT_REPO = 'beast-studio-vault';

/* ---------- studio state snapshot (progress survives deploys) ---------- */

/** Push the whole studio state (day counter, ledger, transcript) as one file. */
export async function pushStudioState(stateJson: string): Promise<PublishResult> {
  if (!githubConfigured()) return { ok: false, deferred: true, reason: 'BEAST_GH_TOKEN not set — studio state stays local-only.' };
  const repo = await ensureRepo(VAULT_REPO, 'Beast Web Developer — studio state vault (auto-created).');
  if (!repo.ok || !repo.fullName) return { ok: false, reason: repo.reason };
  // single-file commit via the Contents API (PUT = create or update)
  const { status, data } = await gh<{ content?: { sha?: string } }>(`/repos/${repo.fullName}/contents/beast-state.json`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `state snapshot — day update (${new Date().toISOString().slice(0, 10)})`,
      content: Buffer.from(stateJson, 'utf8').toString('base64'),
    }),
  });
  if (status !== 200 && status !== 201) return { ok: false, reason: `contents-${status}` };
  return { ok: true, repo: repo.fullName, url: `https://github.com/${repo.fullName}` };
}

/** Fetch the vaulted studio state, or null when absent/unreachable. */
export async function loadStudioState(): Promise<string | null> {
  if (!githubConfigured()) return null;
  const owner = await ghOwner();
  if (!owner) return null;
  const { status, data } = await gh<{ content?: string; encoding?: string }>(`/repos/${owner}/${VAULT_REPO}/contents/beast-state.json`);
  if (status !== 200 || !data?.content) return null;
  try {
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export type PublishResult = { ok: boolean; deferred?: boolean; reason?: string; repo?: string; url?: string; commitUrl?: string };

/** Publish a whole site folder (files already in memory) to its own repo. */
export async function publishSiteFiles(
  brand: string,
  seed: string,
  files: GhFile[],
  tagline: string
): Promise<PublishResult> {
  if (!githubConfigured()) return { ok: false, deferred: true, reason: 'BEAST_GH_TOKEN not set — add it in the Render dashboard (Environment) to enable publishing.' };
  const name = siteRepoName(brand, seed);
  const repo = await ensureRepo(name, `${tagline} — generated & archived by Beast Web Developer v3.`);
  if (!repo.ok || !repo.fullName) return { ok: false, reason: repo.reason };
  const push = await pushFilesToRepo(repo.fullName, files, `Beast v3 publish — ${brand} (seed ${seed.slice(0, 6)})`);
  if (!push.ok) return { ok: false, reason: push.reason };
  return { ok: true, repo: repo.fullName, url: `https://github.com/${repo.fullName}`, commitUrl: push.commitUrl };
}
