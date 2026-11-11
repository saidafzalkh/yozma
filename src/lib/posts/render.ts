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
    // A font present both in headless Chromium (where labels are measured) and in browsers.
    fontFamily: "Arial, Helvetica, sans-serif",
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

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

/** Footnotes labelled `[^ai-…]` mark ideas that came from the model: the call becomes a purple ✦. */
function rehypeAiFootnotes() {
  const isAi = (ref: unknown) => typeof ref === "string" && /fn-ai-/.test(ref);
  return (tree: HastNode) => {
    // Regular notes are renumbered 1, 2, … without the ai ones; the list does the same via CSS counters.
    const numbers = new Map<string, number>();
    const walk = (node: HastNode) => {
      const p = node.properties ?? {};
      if (node.tagName === "a" && "dataFootnoteRef" in p) {
        const href = String(p.href);
        if (isAi(href)) {
          p.className = ["text-ai"];
          node.children = [{ type: "text", value: "✦" }];
        } else {
          if (!numbers.has(href)) numbers.set(href, numbers.size + 1);
          node.children = [{ type: "text", value: String(numbers.get(href)) }];
        }
      } else if (node.tagName === "li" && isAi(p.id)) {
        p.className = ["ai-note"];
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

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
    .use(remarkRehype, {
      footnoteLabel: "Izohlar",
      footnoteLabelProperties: {},
      footnoteBackLabel: (i: number) => `${i + 1}-izohga qaytiş`,
    })
    // Before rehype-mermaid: the inline SVG it adds must not be sanitized away.
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    .use(rehypeAiFootnotes)
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
