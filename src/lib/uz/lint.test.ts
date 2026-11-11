import { describe, expect, it, vi } from "vitest";
import { lintPost, parseBlacklist } from "./lint";

const fm = (extra = "") =>
  `---\ntitle: Salom\ndate: '2026-01-02'\ndescription: Tavsif\ntags:\n  - a\n${extra}---\n\n`;
const base = { protectedWords: ["Claude"], blacklist: ["xulosa qilib aytganda"] };

describe("parseBlacklist", () => {
  it("reads - lines only", () => {
    expect(parseBlacklist("# h\nheader text\n- a b\n- C d\n\n")).toEqual(["a b", "C d"]);
  });
});

describe("lintPost", () => {
  it("errors on missing title", async () => {
    const r = await lintPost("---\ndate: '2026-01-02'\ndescription: x\ntags: [a]\n---\nbody\n", "p", base);
    expect(r.errors.map((e) => e.code)).toContain("frontmatter");
  });

  it("errors on old-alphabet o-modifier in prose with line", async () => {
    const r = await lintPost(fm() + "Bu\noʻzbek tili.\n", "p", base);
    const e = r.errors.find((x) => x.code === "old-og");
    expect(e).toBeDefined();
    expect(e?.line).toBe(10);
  });

  it("flags ascii apostrophe but not tutuq", async () => {
    const a = await lintPost(fm() + "tog' bor\n", "p", base);
    expect(a.errors.some((e) => e.code === "old-og")).toBe(true);
    const b = await lintPost(fm() + "taʼkid so'z\n".replace("so'z", "soz"), "p", base);
    expect(b.errors).toEqual([]);
  });

  it("ignores o-apostrophe in inline code", async () => {
    const r = await lintPost(fm() + "Yozing `oʻ` belgisini.\n", "p", base);
    expect(r.errors.filter((e) => e.code === "old-og")).toEqual([]);
  });

  it("warns on sh/ch in prose, not protected words", async () => {
    const r = await lintPost(fm() + "shahar\n", "p", base);
    expect(r.warnings.some((w) => w.code === "old-sh-ch")).toBe(true);
    const r2 = await lintPost(fm() + "Claude ishlaydi\n", "p", { ...base, protectedWords: ["Claude", "ishlaydi"] });
    expect(r2.warnings.filter((w) => w.code === "old-sh-ch")).toEqual([]);
  });

  it("warns on blacklist phrases case-insensitively", async () => {
    const r = await lintPost(fm() + "Xulosa qilib aytganda, yaxşi.\n", "p", base);
    expect(r.warnings.some((w) => w.code === "blacklist")).toBe(true);
  });

  it("emits suspicious for tahrirchi-flagged token whose old form has ch", async () => {
    const f = vi.fn(async (_u: string | URL | Request, init?: RequestInit) => {
      const v = (JSON.parse(String(init?.body)) as { nodes: { fields: { value: string }[] }[] }).nodes[0].fields[0].value;
      const i = v.indexOf("fetch");
      const data = i < 0 ? [] : [{ offset: i, length: 5, token: "fetch", type: "x", corrections: [] }];
      return new Response(JSON.stringify({ action: "SUGGESTIONS", data }), { status: 200 });
    });
    const r = await lintPost(fm() + "Biz fetç qilamiz.\n", "p", {
      ...base,
      tahrirchi: { apiKey: "K", fetch: f as unknown as typeof fetch },
    });
    const w = r.warnings.find((x) => x.code === "suspicious");
    expect(w?.message).toContain("kod sifatida yozing yoki protected-words.txt ga qöşing");
    expect(r.warnings.some((x) => x.code === "spelling")).toBe(false);
  });

  it("emits spelling for ordinary flagged tokens", async () => {
    const f = vi.fn(async () =>
      new Response(
        JSON.stringify({ action: "SUGGESTIONS", data: [{ offset: 3, length: 3, token: "xyz", type: "x", corrections: ["xyx"] }] }),
        { status: 200 },
      ),
    );
    const r = await lintPost(fm() + "Bu xyz.\n", "p", { ...base, tahrirchi: { apiKey: "K", fetch: f as unknown as typeof fetch } });
    expect(r.warnings.some((x) => x.code === "spelling")).toBe(true);
  });

  it("works without tahrirchi", async () => {
    const r = await lintPost(fm() + "Salom dunyo.\n", "p", base);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.code === "spelling" || w.code === "suspicious")).toBe(false);
  });

  it("keeps local errors and warns when fetch rejects", async () => {
    const f = vi.fn(async () => {
      throw new Error("network down");
    });
    const r = await lintPost(fm() + "oʻzbek\n", "p", { ...base, tahrirchi: { apiKey: "K", fetch: f as unknown as typeof fetch } });
    expect(r.errors.some((e) => e.code === "old-og")).toBe(true);
    const w = r.warnings.find((x) => x.code === "tahrirchi");
    expect(w?.message).toBe("tahrirchi: tekşirib bölmadi — network down");
  });

  it("keeps local errors and warns on HTTP 500", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    const r = await lintPost(fm() + "oʻzbek\n", "p", { ...base, tahrirchi: { apiKey: "K", fetch: f as unknown as typeof fetch } });
    expect(r.errors.some((e) => e.code === "old-og")).toBe(true);
    expect(r.warnings.some((x) => x.code === "tahrirchi" && x.message.includes("boom"))).toBe(true);
  });
});
