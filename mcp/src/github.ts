// Pure GitHub REST client: no Node APIs, network only via the injected fetch.

export interface GitHubOptions {
  token: string;
  repo: string; // "owner/name"
  fetch?: typeof fetch;
}

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

const API = "https://api.github.com";
const IDENTITY = { name: "Yozma MCP", email: "mcp@yozma.uz" };
const CONFLICT_MESSAGE = "fayl boşqa joyda özgargan, qayta urinib köring";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

export function createGitHub(opts: GitHubOptions) {
  const doFetch: typeof fetch = (input, init) => (opts.fetch ?? fetch)(input, init);
  const repoUrl = `${API}/repos/${opts.repo}`;
  const owner = opts.repo.split("/")[0];

  async function request(
    url: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<{ status: number; data: unknown }> {
    const res = await doFetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { status: res.status, data: res.ok ? data : failure(res.status, data) };
  }

  function failure(status: number, data: unknown): never {
    const msg =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `GitHub ${status}`;
    throw new GitHubError(status, msg);
  }

  // Like request, but returns null on 404.
  async function requestOrNull(url: string) {
    try {
      return await request(url);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  return {
    async getFile(path: string, ref?: string): Promise<{ content: string; sha: string } | null> {
      const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const r = await requestOrNull(`${repoUrl}/contents/${encodePath(path)}${q}`);
      if (!r) return null;
      const d = r.data as { content: string; sha: string };
      return { content: fromBase64(d.content), sha: d.sha };
    },

    async putFile(p: {
      path: string;
      content: string;
      message: string;
      branch: string;
      sha?: string;
    }): Promise<{ commitUrl: string }> {
      const body: Record<string, unknown> = {
        message: p.message,
        content: toBase64(p.content),
        branch: p.branch,
        committer: IDENTITY,
        author: IDENTITY,
      };
      if (p.sha) body.sha = p.sha;
      try {
        const r = await request(`${repoUrl}/contents/${encodePath(p.path)}`, { method: "PUT", body });
        return { commitUrl: (r.data as { commit: { html_url: string } }).commit.html_url };
      } catch (e) {
        if (e instanceof GitHubError && (e.status === 409 || e.status === 422)) {
          throw new GitHubError(e.status, CONFLICT_MESSAGE);
        }
        throw e;
      }
    },

    async getBranchSha(branch: string): Promise<string | null> {
      const r = await requestOrNull(`${repoUrl}/git/ref/heads/${encodePath(branch)}`);
      return r ? (r.data as { object: { sha: string } }).object.sha : null;
    },

    async createBranch(name: string, fromSha: string): Promise<void> {
      await request(`${repoUrl}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${name}`, sha: fromSha },
      });
    },

    async findOpenPr(head: string): Promise<{ number: number; url: string } | null> {
      const r = await request(`${repoUrl}/pulls?head=${owner}:${encodePath(head)}&state=open`);
      const list = r.data as Array<{ number: number; html_url: string }>;
      return list.length ? { number: list[0].number, url: list[0].html_url } : null;
    },

    async createPr(p: {
      head: string;
      base: string;
      title: string;
      body: string;
      labels: string[];
    }): Promise<{ number: number; url: string }> {
      const r = await request(`${repoUrl}/pulls`, {
        method: "POST",
        body: { title: p.title, head: p.head, base: p.base, body: p.body },
      });
      const pr = r.data as { number: number; html_url: string };
      // The Pulls API has no labels field; labels go through the Issues API.
      if (p.labels.length) {
        await request(`${repoUrl}/issues/${pr.number}/labels`, {
          method: "POST",
          body: { labels: p.labels },
        });
      }
      return { number: pr.number, url: pr.html_url };
    },
  };
}

export type GitHub = ReturnType<typeof createGitHub>;
