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

  it("drops unsafe link and image protocols", async () => {
    const md = [
      "[a](javascript:alert(1))",
      "[b](JaVaScRiPt:alert(1))",
      "[c](data:text/html;base64,PHNjcmlwdD4=)",
      "[d](vbscript:msgbox(1))",
      "[e](irc://x)",
      "![f](javascript:alert(1))",
      "![g](data:image/svg+xml;base64,AAAA)",
    ].join("\n\n");
    const html = await renderMarkdown(md, "x");
    expect(html).not.toMatch(/javascript:|data:|vbscript:|irc:/i);
    expect(html).toContain(">a</a>");
  });

  it("keeps safe links", async () => {
    const md =
      "[a](https://x.uz/p) [b](mailto:a@b.uz) [c](/posts/x) [d](../y) [e](#bob) ![f](https://x.uz/i.png)";
    const html = await renderMarkdown(md, "x");
    for (const h of ['href="https://x.uz/p"', 'href="mailto:a@b.uz"', 'href="/posts/x"', 'href="../y"', 'src="https://x.uz/i.png"']) {
      expect(html).toContain(h);
    }
    expect(html).toMatch(/href="#(user-content-)?bob"/);
  });

  it("keeps code language classes and GFM footnotes", async () => {
    const html = await renderMarkdown("```ts\nconst a = 1;\n```\n\nMatn[^1]\n\n[^1]: izoh", "x");
    expect(html).toContain('class="language-ts"');
    expect(html).toContain("izoh");
    expect(html).toContain("<sup>");
  });

  it("rejects mermaid syntax errors", { timeout: SLOW }, async () => {
    await expect(
      renderMarkdown("```mermaid\ngraph TD; A-->\n```", "x"),
    ).rejects.toThrow(/^posts\/x\.md: mermaid:/);
  });
});
