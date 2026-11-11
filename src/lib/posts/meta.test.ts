import { describe, expect, it } from "vitest";
import { parsePostMeta, PostMetaError } from "./meta";

const base = { title: "T", date: "2025-07-08", description: "D" };

describe("parsePostMeta", () => {
  it("throws PostMetaError with file prefix when title is missing", () => {
    expect(() => parsePostMeta({ date: "2025-07-08" }, "x")).toThrow(PostMetaError);
    expect(() => parsePostMeta({ date: "2025-07-08" }, "x")).toThrow(/^posts\/x\.md: /);
  });
  it("accepts a JS Date (UTC midnight) and a string date", () => {
    expect(parsePostMeta({ ...base, date: new Date("2025-07-08") }, "x").date).toBe("2025-07-08");
    expect(parsePostMeta(base, "x").date).toBe("2025-07-08");
  });
  it("rejects invalid dates", () => {
    expect(() => parsePostMeta({ ...base, date: "foo" }, "x")).toThrow(/^posts\/x\.md: /);
    expect(() => parsePostMeta({ ...base, date: "2025-02-30" }, "x")).toThrow(PostMetaError);
  });
  it("rejects unknown source", () => {
    expect(() => parsePostMeta({ ...base, source: "gemini" }, "x")).toThrow(PostMetaError);
    expect(parsePostMeta({ ...base, source: "claude" }, "x").source).toBe("claude");
  });
  it("rejects unknown status", () => {
    expect(() => parsePostMeta({ ...base, status: "weird" }, "x")).toThrow(PostMetaError);
  });
  it("defaults status and author", () => {
    const m = parsePostMeta(base, "x");
    expect(m.status).toBe("published");
    expect(m.author).toBe("Saidafzal Kholkhujaev");
    expect(m.slug).toBe("x");
  });
  it("falls back to keywords for tags and lowercases", () => {
    expect(parsePostMeta({ ...base, keywords: ["a"] }, "x").tags).toEqual(["a"]);
    expect(parsePostMeta({ ...base, tags: ["Foo", "BAR"] }, "x").tags).toEqual(["foo", "bar"]);
    expect(parsePostMeta(base, "x").tags).toEqual([]);
  });
  it("validates updated", () => {
    expect(parsePostMeta({ ...base, updated: new Date("2026-01-02") }, "x").updated).toBe("2026-01-02");
    expect(() => parsePostMeta({ ...base, updated: "bad" }, "x")).toThrow(PostMetaError);
  });
});
