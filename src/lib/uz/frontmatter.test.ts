import { describe, expect, it } from "vitest";
import { convertFrontmatterFields, splitFrontmatter } from "./frontmatter";

describe("splitFrontmatter", () => {
  it("splits data and body, with bodyStart offset", () => {
    const src = "---\ntitle: Salom\ndate: 2025-07-08\n---\n\nBody\n";
    const r = splitFrontmatter(src);
    expect(r.data.title).toBe("Salom");
    expect(r.data.date).toBe("2025-07-08");
    expect(r.body).toBe("\nBody\n");
    expect(src.slice(r.bodyStart)).toBe(r.body);
  });
  it("no frontmatter", () => {
    expect(splitFrontmatter("Just text\n")).toEqual({ data: {}, body: "Just text\n", bodyStart: 0 });
  });
  it("--- not at file start is not frontmatter", () => {
    const src = "\n---\na: 1\n---\n";
    expect(splitFrontmatter(src)).toEqual({ data: {}, body: src, bodyStart: 0 });
  });
  it("unclosed frontmatter is treated as none", () => {
    const src = "---\na: 1\n";
    expect(splitFrontmatter(src)).toEqual({ data: {}, body: src, bodyStart: 0 });
  });
  it("empty frontmatter gives empty data", () => {
    expect(splitFrontmatter("---\n---\nx").data).toEqual({});
  });
  it("handles CRLF", () => {
    const r = splitFrontmatter("---\r\ntitle: A\r\n---\r\nB");
    expect(r.data.title).toBe("A");
    expect(r.body).toBe("B");
  });
  it("throws on invalid YAML", () => {
    expect(() => splitFrontmatter("---\ntitle: [a\n---\nx")).toThrow();
  });
  it("throws when frontmatter is not a mapping", () => {
    expect(() => splitFrontmatter("---\n- a\n- b\n---\nx")).toThrow();
  });
});

describe("convertFrontmatterFields", () => {
  it("converts title, description and each tag; leaves others", () => {
    const input = { title: "Oʻzbek shahar", description: "Gʻoya", tags: ["dasturlash", "Choy", 5], date: "2026-01-01" };
    const out = convertFrontmatterFields(input, []);
    expect(out).toEqual({ title: "Özbek şahar", description: "Ğoya", tags: ["dasturlaş", "Çoy", 5], date: "2026-01-01" });
    expect(input.title).toBe("Oʻzbek shahar"); // not mutated
  });
  it("respects protected words", () => {
    expect(convertFrontmatterFields({ title: "ChatGPT shahar" }, ["ChatGPT"]).title).toBe("ChatGPT şahar");
  });
});
