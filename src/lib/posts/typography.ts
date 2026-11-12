type MdNode = { type: string; value?: string; children?: MdNode[] };

/** Blocks within which straight double quotes are paired, across inline markup like `**…**`. */
const QUOTE_SCOPES = new Set(["paragraph", "heading", "tableCell"]);

/** Ellipses and spaced dashes; `--flag` without surrounding spaces stays as written. */
export function uzPunctuation(text: string): string {
  return text.replace(/\.\.\./g, "…").replace(/(^|\s)--(?=\s|$)/g, "$1—");
}

/** Remark plugin: Uzbek quotes «», em dashes and ellipses in prose. Code is untouched. */
export function remarkUzTypography() {
  const walk = (node: MdNode, quote: { open: boolean } | null) => {
    if (node.type === "text" && node.value !== undefined) {
      let value = uzPunctuation(node.value);
      if (quote) {
        value = value.replace(/"/g, () => {
          quote.open = !quote.open;
          return quote.open ? "«" : "»";
        });
      }
      node.value = value;
    }
    const scope = QUOTE_SCOPES.has(node.type) ? { open: false } : quote;
    node.children?.forEach((child) => walk(child, scope));
  };
  return (tree: MdNode) => walk(tree, null);
}
