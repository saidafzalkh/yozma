import rehypeMermaid from "rehype-mermaid";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export const MERMAID_CONFIG = {
  theme: "base",
  themeVariables: {
    primaryColor: "#f3f4f6",
    primaryBorderColor: "#111827",
    primaryTextColor: "#111827",
    lineColor: "#4b5563",
    fontFamily: "Inter, sans-serif",
  },
} as const;

/** Same as the default schema, but only http, https and mailto links (and http(s) images). */
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

/** The page renders the h1, so a leading `# ` line is dropped from the body. */
function stripLeadingH1(markdown: string): string {
  const lines = markdown.split("\n");
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first !== -1 && lines[first].startsWith("# ")) lines.splice(first, 1);
  return lines.join("\n");
}

export async function renderMarkdown(
  markdown: string,
  slug: string,
): Promise<string> {
  let mermaidError: unknown;
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    // Before rehype-mermaid: the inline SVG it adds must not be sanitized away.
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    .use(rehypeMermaid, {
      strategy: "inline-svg",
      mermaidConfig: MERMAID_CONFIG,
      errorFallback: (_element, _diagram, error) => {
        mermaidError ??= error;
        return undefined;
      },
    })
    .use(rehypeStringify);

  const file = await processor.process(stripLeadingH1(markdown));
  if (mermaidError !== undefined) {
    const msg =
      mermaidError instanceof Error ? mermaidError.message : String(mermaidError);
    throw new Error(`posts/${slug}.md: mermaid: ${msg}`);
  }
  return String(file);
}
