import { describe, expect, it } from "vitest";
import { buildRss } from "./rss";

const site = { url: "https://yozma.uz", title: "Yozma", description: "Fikrlar & suhbatlar" };

describe("buildRss", () => {
  it("renders an RSS 2.0 channel with escaped items, newest first as given", () => {
    const xml = buildRss(
      [
        { slug: "b", title: "Ikki <post>", date: "2026-11-12", description: "Q & A" },
        { slug: "a", title: "Bir", date: "2025-07-07", description: "" },
      ],
      site,
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<title>Yozma</title>");
    expect(xml).toContain("<description>Fikrlar &amp; suhbatlar</description>");
    expect(xml).toContain("<title>Ikki &lt;post&gt;</title>");
    expect(xml).toContain("<link>https://yozma.uz/b</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://yozma.uz/b</guid>');
    expect(xml).toContain("<pubDate>Thu, 12 Nov 2026 00:00:00 GMT</pubDate>");
    expect(xml).toContain("<description>Q &amp; A</description>");
    expect(xml.indexOf("/b<")).toBeLessThan(xml.indexOf("/a<"));
    expect(xml).toContain('<atom:link href="https://yozma.uz/rss.xml" rel="self" type="application/rss+xml"/>');
  });
});
