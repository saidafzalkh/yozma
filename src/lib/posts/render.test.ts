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
    expect(html).toMatch(/<pre class="shiki[^"]*"[^>]*><code/);
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

  it("renders ai footnotes as a purple ✦, keeps others numeric, labels in uzbek", async () => {
    const html = await renderMarkdown(
      "Fikr[^ai-1]. Atama[^1].\n\n[^ai-1]: Claude taklif qildi.\n[^1]: Izoh.",
      "x",
    );
    expect(html).toMatch(/<a[^>]*class="text-ai"[^>]*>✦<\/a>/);
    expect(html).toMatch(/data-footnote-ref[^>]*>\d+<\/a>/);
    expect(html).toMatch(/<li[^>]*class="ai-note"/);
    expect(html).toContain("Izohlar");
    expect(html).not.toContain("Footnotes");
  });

  it("numbers regular footnotes consecutively, skipping ai notes", async () => {
    const html = await renderMarkdown(
      "A[^1] B[^ai-1] C[^2].\n\n[^1]: a\n[^ai-1]: b\n[^2]: c",
      "x",
    );
    const refs = [...html.matchAll(/data-footnote-ref[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
    expect(refs).toEqual(["1", "✦", "2"]);
  });

  it("applies Uzbek typography outside code", async () => {
    const html = await renderMarkdown(
      'U "salom" dedi -- keyin kutdi... `"x" -- y` va maʼno\n\n```\n"a" -- b\n```',
      "x",
    );
    expect(html).toContain("U «salom» dedi — keyin kutdi…");
    expect(html).toContain('<code>"x" -- y</code>');
    expect(html).toContain('"a" -- b');
    expect(html).toContain("maʼno");
  });

  it("highlights code with shiki, tolerates unknown languages", async () => {
    const html = await renderMarkdown("```ts\nconst a = 1;\n```\n\n```nosuchlang\nzzz\n```", "x");
    expect(html).toContain('class="shiki');
    expect(html).toMatch(/style="[^"]*color/);
    expect(html).toContain("zzz");
  });

  it("copies footnotes into sidenotes next to their reference", async () => {
    const html = await renderMarkdown("A[^1] B[^ai-1].\n\n[^1]: Birinçi izoh.\n[^ai-1]: Claude bilan.", "x");
    expect(html).toMatch(/<\/sup><span class="sidenote"[^>]*><span class="sidenote-number">1<\/span>\s*Birinçi izoh\.<\/span>/);
    expect(html).toMatch(/<span class="sidenote ai"[^>]*><span class="sidenote-number">✦<\/span>\s*Claude bilan\.<\/span>/);
    expect(html).not.toMatch(/class="sidenote[^"]*"[^>]*>[^<]*<[^>]*data-footnote-backref/);
  });

  it("footnote links point at existing ids (both directions)", async () => {
    const html = await renderMarkdown("A[^1] B[^ai-1].\n\n[^1]: a\n[^ai-1]: b", "x");
    const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThanOrEqual(4);
    for (const t of targets) expect(ids).toContain(t);
  });

  it("typography: dashes only between spaces, quotes paired across inline markup", async () => {
    const html = await renderMarkdown('Run --force now -- then "**x**" and "y".', "x");
    expect(html).toContain("Run --force now — then «<strong>x</strong>» and «y».");
  });

  it("only simple footnotes become sidenotes; complex ones keep the visible section", async () => {
    const simple = await renderMarkdown("A[^a].\n\n[^a]: Bir.", "x");
    expect(simple).toContain('class="sidenote"');
    expect(simple).toMatch(/<section[^>]*class="footnotes all-sidenoted"/);

    const complex = await renderMarkdown(
      "A[^a] again[^a].\n\n[^a]: See B[^b].\n\n    Second paragraph.\n\n[^b]: Inner.",
      "x",
    );
    const ids = [...complex.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(complex).not.toMatch(/all-sidenoted/);
    const sidenotes = complex.split('<span class="sidenote').slice(1).map((s) => s.split("</span></span>")[0]);
    expect(sidenotes.some((s) => s.includes("See B"))).toBe(false);
  });
});
