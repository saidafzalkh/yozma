export interface RssSite {
  url: string;
  title: string;
  description: string;
}

export interface RssItem {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

/** RSS 2.0 feed; items are written in the order given (callers pass newest first). */
export function buildRss(items: RssItem[], site: RssSite): string {
  const entries = items.map((item) => {
    const link = `${site.url}/${item.slug}`;
    return [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <pubDate>${rfc822(item.date)}</pubDate>`,
      `      <description>${escapeXml(item.description)}</description>`,
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(site.title)}</title>`,
    `    <link>${site.url}</link>`,
    `    <description>${escapeXml(site.description)}</description>`,
    "    <language>uz</language>",
    `    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ...entries,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
