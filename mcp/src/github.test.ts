import { describe, expect, it, vi } from "vitest";
import { createGitHub, GitHubError } from "./github";

type Call = { url: string; init: RequestInit };

function mockFetch(responses: Array<{ status?: number; body?: unknown }>) {
  const calls: Call[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body ?? {}), {
      status: r.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

const mk = (r: Parameters<typeof mockFetch>[0]) => {
  const m = mockFetch(r);
  return { ...m, gh: createGitHub({ token: "tok", repo: "saidafzalkh/yozma", fetch: m.fetch }) };
};

describe("github client", () => {
  it("sends auth and API headers", async () => {
    const { gh, calls } = mk([{ body: { object: { sha: "abc" } } }]);
    await gh.getBranchSha("main");
    const h = new Headers(calls[0].init.headers);
    expect(h.get("authorization")).toBe("Bearer tok");
    expect(h.get("accept")).toBe("application/vnd.github+json");
    expect(h.get("x-github-api-version")).toBe("2022-11-28");
    expect(calls[0].url).toBe("https://api.github.com/repos/saidafzalkh/yozma/git/ref/heads/main");
  });

  it("getFile returns null on 404", async () => {
    const { gh } = mk([{ status: 404, body: { message: "Not Found" } }]);
    expect(await gh.getFile("posts/x.md")).toBeNull();
  });

  it("getFile decodes UTF-8 base64 and passes ref", async () => {
    const text = "özbek ʼ ✦";
    const { gh, calls } = mk([{ body: { content: b64(text).replace(/(.{4})/g, "$1\n"), sha: "s1" } }]);
    expect(await gh.getFile("posts/a b.md", "post/x")).toEqual({ content: text, sha: "s1" });
    expect(calls[0].url).toBe(
      "https://api.github.com/repos/saidafzalkh/yozma/contents/posts/a%20b.md?ref=post%2Fx",
    );
  });

  it("putFile round-trips UTF-8, sets committer/author, sha only when given", async () => {
    const text = "özbek ʼ ✦";
    const { gh, calls } = mk([
      { body: { commit: { html_url: "https://c/1" } } },
      { body: { commit: { html_url: "https://c/2" } } },
    ]);
    const r1 = await gh.putFile({ path: "posts/x.md", content: text, message: "m", branch: "post/x" });
    await gh.putFile({ path: "posts/x.md", content: text, message: "m", branch: "post/x", sha: "old" });
    expect(r1).toEqual({ commitUrl: "https://c/1" });
    expect(calls[0].init.method).toBe("PUT");
    const b1 = JSON.parse(String(calls[0].init.body));
    const b2 = JSON.parse(String(calls[1].init.body));
    expect(atob(b1.content)).toBe(
      String.fromCharCode(...new TextEncoder().encode(text)),
    );
    expect("sha" in b1).toBe(false);
    expect(b2.sha).toBe("old");
    expect(b1.branch).toBe("post/x");
    const who = { name: "Yozma MCP", email: "mcp@yozma.uz" };
    expect(b1.committer).toEqual(who);
    expect(b1.author).toEqual(who);
  });

  it.each([409, 422])("putFile %i -> Uzbek GitHubError", async (status) => {
    const { gh } = mk([{ status, body: { message: "conflict" } }]);
    const err = await gh
      .putFile({ path: "p.md", content: "x", message: "m", branch: "b" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect((err as GitHubError).status).toBe(status);
    expect((err as GitHubError).message).toBe("fayl boşqa joyda özgargan, qayta urinib köring");
  });

  it("other non-2xx throws GitHubError", async () => {
    const { gh } = mk([{ status: 500, body: { message: "boom" } }]);
    await expect(gh.getBranchSha("main")).rejects.toMatchObject({ status: 500, message: "boom" });
  });

  it("getBranchSha returns null on 404", async () => {
    const { gh } = mk([{ status: 404 }]);
    expect(await gh.getBranchSha("nope")).toBeNull();
  });

  it("createBranch posts ref", async () => {
    const { gh, calls } = mk([{ status: 201 }]);
    await gh.createBranch("post/x", "sha1");
    expect(calls[0].url).toBe("https://api.github.com/repos/saidafzalkh/yozma/git/refs");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ ref: "refs/heads/post/x", sha: "sha1" });
  });

  it("findOpenPr uses owner:branch head and state=open", async () => {
    const { gh, calls } = mk([
      { body: [{ number: 7, html_url: "https://pr/7" }] },
      { body: [] },
    ]);
    expect(await gh.findOpenPr("post/x")).toEqual({ number: 7, url: "https://pr/7" });
    expect(calls[0].url).toContain("head=saidafzalkh:post/x&state=open");
    expect(await gh.findOpenPr("post/y")).toBeNull();
  });

  it("createPr creates then labels via Issues API", async () => {
    const { gh, calls } = mk([
      { status: 201, body: { number: 3, html_url: "https://pr/3" } },
      { status: 200, body: [] },
    ]);
    const r = await gh.createPr({ head: "post/x", base: "main", title: "t", body: "b", labels: ["post"] });
    expect(r).toEqual({ number: 3, url: "https://pr/3" });
    expect(calls[0].url).toBe("https://api.github.com/repos/saidafzalkh/yozma/pulls");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ title: "t", head: "post/x", base: "main", body: "b" });
    expect(calls[1].url).toBe("https://api.github.com/repos/saidafzalkh/yozma/issues/3/labels");
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ labels: ["post"] });
  });

  it("createPr skips labels call when none", async () => {
    const { gh, calls } = mk([{ status: 201, body: { number: 3, html_url: "u" } }]);
    await gh.createPr({ head: "h", base: "main", title: "t", body: "b", labels: [] });
    expect(calls).toHaveLength(1);
  });
});
