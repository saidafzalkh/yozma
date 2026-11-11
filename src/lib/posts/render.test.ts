import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./render";

const SLOW = 60_000;

describe("renderMarkdown", () => {
  it("renders headings and paragraphs", async () => {
    const html = await renderMarkdown("## Sarlavha\n\nMatn.", "x");
    expect(html).toContain("<h2>");
    expect(html).toContain("<p>");
  });

  it("renders GFM tables", async () => {
    const html = await renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |", "x");
    expect(html).toContain("<table>");
  });

  it("keeps plain code blocks", async () => {
    const html = await renderMarkdown("```ts\nconst a = 1;\n```", "x");
    expect(html).toContain("<pre><code");
  });

  it("drops the leading h1 only", async () => {
    const html = await renderMarkdown("\n# T\n\ntext\n\n# Later", "x");
    expect(html).not.toContain("<h1>T</h1>");
    expect(html).toContain("<h1>Later</h1>");
  });

  it("renders mermaid to inline svg", { timeout: SLOW }, async () => {
    const html = await renderMarkdown("```mermaid\ngraph TD; A-->B\n```", "x");
    expect(html).toContain("<svg");
    expect(html).not.toContain('class="language-mermaid"');
  });

  it("rejects mermaid syntax errors", { timeout: SLOW }, async () => {
    await expect(
      renderMarkdown("```mermaid\ngraph TD; A-->\n```", "x"),
    ).rejects.toThrow(/^posts\/x\.md: mermaid:/);
  });
});
