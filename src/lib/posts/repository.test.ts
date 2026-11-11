import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readCommits } from "./git";
import { getAllTags, getPost, getPublishedPosts } from "./repository";

const fm = (o: Record<string, string>, body = "Body") =>
  `---\n${Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}\n`;

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "yozma-posts-"));
  fs.writeFileSync(path.join(dir, "new-post.md"), fm({ title: "New", date: "2026-02-01", description: "d", tags: "[Dasturlash, Ai]" }));
  fs.writeFileSync(path.join(dir, "draft-slug.md"), fm({ title: "Draft", date: "2026-03-01", status: "draft", tags: "[secret]" }));
  fs.writeFileSync(path.join(dir, "old-post.md"), fm({ title: "Old", date: "2025-07-08", tags: "[dasturlash]" }));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("repository", () => {
  it("lists published posts newest first, without drafts", () => {
    const posts = getPublishedPosts(dir);
    expect(posts.map((p) => p.slug)).toEqual(["new-post", "old-post"]);
    expect(posts[0].body.trim()).toBe("Body");
    expect(posts[0].editedDate).toBeUndefined();
  });
  it("getPost returns null for draft and missing", () => {
    expect(getPost("draft-slug", dir)).toBeNull();
    expect(getPost("nope", dir)).toBeNull();
    expect(getPost("old-post", dir)?.title).toBe("Old");
  });
  it("throws with the file name on broken frontmatter", () => {
    fs.writeFileSync(path.join(dir, "broken.md"), fm({ date: "2026-01-01" }));
    try {
      expect(() => getPublishedPosts(dir)).toThrow(/posts\/broken\.md: /);
    } finally {
      fs.rmSync(path.join(dir, "broken.md"));
    }
  });
  it("groups tags by slug, excluding drafts", () => {
    const tags = getAllTags(dir);
    expect(tags.map((t) => t.slug).sort()).toEqual(["ai", "dasturlash"]);
    const d = tags.find((t) => t.slug === "dasturlash");
    expect(d?.posts.map((p) => p.slug)).toEqual(["new-post", "old-post"]);
  });
  it("readCommits returns [] outside git", () => {
    expect(readCommits(path.join(dir, "new-post.md"))).toEqual([]);
  });
});
