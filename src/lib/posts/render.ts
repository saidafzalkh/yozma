import rehypeShiki from "@shikijs/rehype";
import rehypeMermaid from "rehype-mermaid";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { remarkUzTypography } from "./typography";

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
  // remark-rehype already prefixes footnote ids with `user-content-`; prefixing again breaks the links.
  clobber: [],
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

const isBackref = (n: HastNode) => n.tagName === "a" && "dataFootnoteBackref" in (n.properties ?? {});
const containsTag = (n: HastNode, tag: string): boolean =>
  n.tagName === tag || (n.children ?? []).some((c) => containsTag(c, tag));

/**
 * Copies each simple footnote (one paragraph, no nested footnotes) next to its reference as
 * `<span class="sidenote">`, shown in the margin on wide screens. If every note is simple, the
 * footnotes section gets `all-sidenoted` and is only visually hidden there (screen readers keep it).
 * Runs after rehypeAiFootnotes.
 */
function rehypeSidenotes() {
  const notes = new Map<string, HastNode[]>();
  let allSimple = true;
  const collect = (node: HastNode) => {
    const id = node.properties?.id;
    if (node.tagName === "li" && typeof id === "string" && id.includes("fn-")) {
      const blocks = (node.children ?? []).filter((c) => c.type === "element");
      const para = blocks.length === 1 && blocks[0].tagName === "p" ? blocks[0] : undefined;
      if (para && !containsTag(para, "sup")) {
        const content = (para.children ?? []).filter((c) => !isBackref(c));
        const last = content[content.length - 1];
        if (last?.type === "text" && last.value) last.value = last.value.trimEnd();
        notes.set(`#${id}`, content);
      } else {
        allSimple = false;
      }
      return;
    }
    node.children?.forEach(collect);
  };
  const markSection = (node: HastNode) => {
    if (node.tagName === "section" && node.properties && "dataFootnotes" in node.properties) {
      node.properties.className = ["footnotes", "all-sidenoted"];
      return;
    }
    node.children?.forEach(markSection);
  };
  const insert = (node: HastNode) => {
    const children = node.children;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      const sup = children[i];
      const ref = sup.tagName === "sup" ? sup.children?.find((c) => c.tagName === "a") : undefined;
      const content = ref ? notes.get(String(ref.properties?.href)) : undefined;
      if (ref && content) {
        const ai = /fn-ai-/.test(String(ref.properties?.href));
        const label = ref.children?.[0]?.value ?? "";
        children.splice(i + 1, 0, {
          type: "element",
          tagName: "span",
          properties: { className: ai ? ["sidenote", "ai"] : ["sidenote"], ariaHidden: "true" },
          children: [
            { type: "element", tagName: "span", properties: { className: ["sidenote-number"] }, children: [{ type: "text", value: label }] },
            { type: "text", value: " " },
            ...structuredClone(content),
          ],
        });
        i++;
      } else {
        insert(sup);
      }
    }
  };
  return (tree: HastNode) => {
    collect(tree);
    insert(tree);
    if (allSimple && notes.size > 0) markSection(tree);
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
    .use(remarkUzTypography)
    .use(remarkRehype, {
      footnoteLabel: "Izohlar",
      footnoteLabelProperties: {},
      footnoteBackLabel: (i: number) => `${i + 1}-izohga qaytiş`,
    })
    // Before rehype-mermaid: the inline SVG it adds must not be sanitized away.
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    .use(rehypeAiFootnotes)
    .use(rehypeSidenotes)
    .use(rehypeMermaid, {
      strategy: "inline-svg",
      mermaidConfig: MERMAID_CONFIG,
      errorFallback: (_element, _diagram, error) => {
        mermaidError ??= error;
        return undefined;
      },
    })
    // After mermaid, so diagrams are already SVG; inline colour styles are added after sanitizing.
    .use(rehypeShiki, { theme: "min-light", lazy: true, fallbackLanguage: "text", addLanguageClass: true })
    .use(rehypeStringify);

  const file = await processor.process(stripLeadingH1(markdown));
  if (mermaidError !== undefined) {
    const msg =
      mermaidError instanceof Error ? mermaidError.message : String(mermaidError);
    throw new Error(`posts/${slug}.md: mermaid: ${msg}`);
  }
  return String(file);
}
