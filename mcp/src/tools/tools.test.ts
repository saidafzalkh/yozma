import { describe, expect, it } from "vitest";
import { splitFrontmatter } from "../../../src/lib/uz/frontmatter";
import { parsePostMeta } from "../../../src/lib/posts/meta";
import { createFakeGitHub } from "./fake-github";
import { getGuide } from "./guide";
import { checkUzbek, convertAlphabet } from "./check";
import { publishPost, type PostInput } from "./publish";
import { updatePost } from "./update";
import { buildPostFile, ToolError, type ToolDeps } from "./post-file";

const writing = {
  "writing/interview.md": "# Interview\nsavollar",
  "writing/style.md": "# Style\nuslub",
  "writing/blacklist.md": "- Uşbu\n",
  "writing/protected-words.txt": "ChatGPT\nClaude\n",
};

function setup(extra: Record<string, string> = {}, over: Partial<ToolDeps> = {}) {
  const fake = createFakeGitHub({ ...writing, ...extra });
  const deps: ToolDeps = { gh: fake.gh, today: () => "2026-11-12", model: "Claude Sonnet", ...over };
  return { fake, deps };
}

const input: PostInput = {
  slug: "birinci-post",
  title: "Birinchi post",
  description: "Qisqa tavsif",
  tags: ["ai", "yozuv"],
  source: "claude",
  seed: "Bugun ChatGPT bilan gaplashdim",
  body: "# Birinchi post\n\nBugun ChatGPT bilan gaplashdim, o'zbekcha yozdik.\n",
};

describe("getGuide", () => {
  it("joins interview, style and blacklist", async () => {
    const { deps } = setup();
    const g = await getGuide(deps);
    expect(g).toContain("savollar");
    expect(g).toContain("uslub");
    expect(g).toContain("Uşbu");
  });
  it("errors when interview or style is missing", async () => {
    const { deps } = setup();
    deps.gh = createFakeGitHub({ "writing/style.md": "x" }).gh;
    await expect(getGuide(deps)).rejects.toThrow(/interview/);
    deps.gh = createFakeGitHub({ "writing/interview.md": "x" }).gh;
    await expect(getGuide(deps)).rejects.toThrow(/style/);
  });
  it("tolerates a missing blacklist", async () => {
    const gh = createFakeGitHub({ "writing/interview.md": "A", "writing/style.md": "B" }).gh;
    expect(await getGuide({ gh, today: () => "2026-11-12" })).toContain("B");
  });
});

describe("convertAlphabet / checkUzbek", () => {
  it("converts and keeps protected words", async () => {
    const { deps } = setup();
    const out = await convertAlphabet(deps, "o'zbek ChatGPT");
    expect(out).toContain("özbek");
    expect(out).toContain("ChatGPT");
  });
  it("works with no writing files (empty lists)", async () => {
    const gh = createFakeGitHub({}).gh;
    expect(await convertAlphabet({ gh, today: () => "2026-11-12" }, "o'zbek")).toContain("özbek");
  });
  it("converts then lints the body; lines are body-relative", async () => {
    const { deps } = setup();
    const r = await checkUzbek(deps, "birinchi qator\nUshbu gap yomon");
    expect(r.converted).toBe("birinçi qator\nUşbu gap yomon");
    const all = [...r.errors, ...r.warnings];
    const bl = all.find((i) => i.code === "blacklist");
    expect(bl?.line).toBe(2);
    expect(all.some((i) => i.code === "frontmatter")).toBe(false);
  });
});

describe("buildPostFile", () => {
  it("round-trips through splitFrontmatter + parsePostMeta", () => {
    const file = buildPostFile(
      { tags: ["a", "b"], title: "Sarlavha: nima", description: "d", date: "2026-11-12", author: "Saidafzal Kholkhujaev", source: "claude" },
      "# H\n\nmatn",
    );
    expect(file.startsWith("---\ntitle: ")).toBe(true);
    expect(file.indexOf("date:")).toBeLessThan(file.indexOf("author:"));
    expect(file.endsWith("matn\n")).toBe(true);
    const fm = splitFrontmatter(file);
    const meta = parsePostMeta(fm.data, "x");
    expect(meta.date).toBe("2026-11-12");
    expect(meta.title).toBe("Sarlavha: nima");
    expect(meta.tags).toEqual(["a", "b"]);
  });
});

describe("publishPost", () => {
  it("direct: commits converted file to main with trailer", async () => {
    const { deps, fake } = setup();
    const r = await publishPost(deps, input, "direct");
    expect(r.postUrl).toBe("https://yozma.uz/birinci-post");
    const c = fake.commits.at(-1)!;
    expect(c.branch).toBe("main");
    expect(c.path).toBe("posts/birinci-post.md");
    expect(c.message).toBe("post: birinci-post\n\nCo-Authored-By: Claude Sonnet via Yozma MCP");
    expect(c.content).toContain("date: 2026-11-12");
    expect(c.content).toContain("özbekça");
    expect(c.content).toContain("ChatGPT");
    expect(c.content).not.toContain("o'zbekcha");
    expect(c.content).toContain("# Birinçi post");
    const meta = parsePostMeta(splitFrontmatter(c.content).data, "birinci-post");
    expect(meta.date).toBe("2026-11-12");
    expect(meta.source).toBe("claude");
  });
  it("uses AI when no model is given", async () => {
    const { deps, fake } = setup({}, { model: undefined });
    await publishPost(deps, input, "direct");
    expect(fake.commits.at(-1)!.message).toContain("Co-Authored-By: AI via Yozma MCP");
  });
  it("existing slug -> error suggesting update_post, nothing overwritten", async () => {
    const { deps, fake } = setup({ "posts/birinci-post.md": "eski" });
    await expect(publishPost(deps, input, "direct")).rejects.toThrow(/update_post/);
    expect(fake.commits).toHaveLength(0);
    expect(fake.branches.get("main")!.get("posts/birinci-post.md")).toBe("eski");
  });
  it("rejects a bad slug", async () => {
    const { deps } = setup();
    await expect(publishPost(deps, { ...input, slug: "Bad Slug" }, "direct")).rejects.toThrow(/slug/);
  });
  it("lint errors -> nothing committed, errors returned", async () => {
    const { deps, fake } = setup();
    const bad = { ...input, body: "matn `kod` va tahrirchi ish" };
    // A bad tag breaks frontmatter validation.
    const err = await publishPost(deps, { ...bad, tags: ["???"] }, "direct").catch((e) => e);
    expect(err).toBeInstanceOf(ToolError);
    expect((err as ToolError).issues.length).toBeGreaterThan(0);
    expect(fake.commits).toHaveLength(0);
    expect(fake.branches.size).toBe(1);
  });
  it("review: branch, commit, labelled PR with warnings", async () => {
    const { deps, fake } = setup();
    const r = await publishPost(deps, input, "review");
    expect(r.url).toBe("https://github.com/x/pull/1");
    expect(fake.branches.has("post/birinci-post")).toBe(true);
    expect(fake.commits.at(-1)!.branch).toBe("post/birinci-post");
    expect(fake.branches.get("main")!.has("posts/birinci-post.md")).toBe(false);
    const pr = fake.prs[0];
    expect(pr.title).toBe("Post: Birinçi post");
    expect(pr.labels).toEqual(["post"]);
    expect(pr.base).toBe("main");
    expect(pr.body).toContain("Qisqa tavsif");
  });
  it("review: PR body says Ogohlantiriş yöq. with no warnings", async () => {
    const { deps, fake } = setup();
    const r = await publishPost(deps, { ...input, seed: undefined, body: "# Salom\n\nOddiy gap." }, "review");
    if (r.warnings.length === 0) expect(fake.prs[0].body).toContain("Ogohlantiriş yöq.");
    else for (const w of r.warnings) expect(fake.prs[0].body).toContain(w.message);
  });
  it("review: existing branch -> error", async () => {
    const { deps, fake } = setup();
    await publishPost(deps, input, "review");
    fake.prs.length = 0;
    await expect(publishPost(deps, input, "review")).rejects.toThrow(/şöba/);
  });
});

describe("updatePost", () => {
  const existing = (date = "2026-01-05") =>
    buildPostFile(
      { title: "Eski sarlavha", date, author: "Saidafzal Kholkhujaev", description: "eski", source: "claude", tags: ["ai"] },
      "# Eski sarlavha\n\nEski matn.",
    );

  it("no mode and no open PR -> mode kerak", async () => {
    const { deps } = setup({ "posts/p.md": existing() });
    await expect(updatePost(deps, { slug: "p", title: "Yangi" })).rejects.toThrow(/mode kerak: direct yoki review/);
  });
  it("missing post -> error", async () => {
    const { deps } = setup();
    await expect(updatePost(deps, { slug: "p", title: "Yangi" }, "direct")).rejects.toThrow(/topilmadi/);
  });
  it("direct: merges fields, keeps date, commits to main", async () => {
    const { deps, fake } = setup({ "posts/p.md": existing() });
    const r = await updatePost(deps, { slug: "p", title: "Yangi sarlavha", body: "# Yangi\n\nO'zgardi." }, "direct");
    const c = fake.commits.at(-1)!;
    expect(c.branch).toBe("main");
    expect(c.message).toBe("post: update p\n\nCo-Authored-By: Claude Sonnet via Yozma MCP");
    const meta = parsePostMeta(splitFrontmatter(c.content).data, "p");
    expect(meta.date).toBe("2026-01-05");
    expect(meta.title).toBe("Yangi sarlavha");
    expect(meta.description).toBe("eski");
    expect(c.content).toContain("Özgardi.");
    expect(c.content).not.toContain("updated:");
    expect(r.url).toContain("/commit/");
  });
  it("direct without body keeps the old body", async () => {
    const { deps, fake } = setup({ "posts/p.md": existing() });
    await updatePost(deps, { slug: "p", description: "yangi" }, "direct");
    expect(fake.commits.at(-1)!.content).toContain("Eski matn.");
  });
  it("review: new branch + PR, main untouched", async () => {
    const { deps, fake } = setup({ "posts/p.md": existing() });
    const r = await updatePost(deps, { slug: "p", title: "Yangi" }, "review");
    expect(r.url).toBe("https://github.com/x/pull/1");
    expect(fake.commits.at(-1)!.branch).toBe("post/p");
    expect(fake.branches.get("main")!.get("posts/p.md")).toBe(existing());
    expect(fake.prs[0].labels).toEqual(["post"]);
  });
  it("open PR: commits to the post branch, refreshes date, ignores mode", async () => {
    const { deps, fake } = setup();
    await publishPost({ ...deps, today: () => "2026-11-01" }, input, "review");
    const r = await updatePost(deps, { slug: "birinci-post", description: "Yangilangan" });
    const c = fake.commits.at(-1)!;
    expect(c.branch).toBe("post/birinci-post");
    expect(c.message).toContain("post: update birinci-post");
    expect(r.url).toBe("https://github.com/x/pull/1");
    const meta = parsePostMeta(splitFrontmatter(c.content).data, "birinci-post");
    expect(meta.date).toBe("2026-11-12");
    expect(meta.description).toBe("Yangilangan");
    expect(fake.prs).toHaveLength(1);
  });
  it("retained content is converted too", async () => {
    const old = buildPostFile(
      { title: "Eski", date: "2026-01-05", author: "Saidafzal Kholkhujaev", description: "eski", source: "claude", tags: ["ai"] },
      "Old shahar va o'zbek.",
    );
    const { deps, fake } = setup({ "posts/p.md": old });
    await updatePost(deps, { slug: "p", description: "Yangi" }, "direct");
    const c = fake.commits.at(-1)!.content;
    expect(c).toContain("Old şahar");
    expect(c).toContain("özbek");
    expect(c).not.toContain("o'zbek");
  });
  it("PR closed between lookup and commit -> error with commit URL", async () => {
    const { deps, fake } = setup();
    await publishPost(deps, input, "review");
    const put = fake.gh.putFile;
    fake.gh.putFile = async (p) => {
      const r = await put(p);
      fake.prs.length = 0;
      return r;
    };
    const err = await updatePost(deps, { slug: "birinci-post", description: "Y" }).catch((e) => e);
    expect(err).toBeInstanceOf(ToolError);
    expect(err.message).toContain("post/birinci-post");
    expect(err.message).toContain("/commit/");
    expect(err.message).toContain("update_post");
  });
  it("lint errors on update -> nothing committed", async () => {
    const { deps, fake } = setup({ "posts/p.md": existing() });
    const before = fake.commits.length;
    await expect(updatePost(deps, { slug: "p", tags: ["???"] }, "direct")).rejects.toBeInstanceOf(ToolError);
    expect(fake.commits.length).toBe(before);
  });
});
