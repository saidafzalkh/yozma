type MdNode = { type: string; value?: string; children?: MdNode[] };

/** Opening quote: at the start of a text run or after whitespace / an opening bracket / a dash. */
const OPENING_QUOTE = /(^|[\s([{«—–-])"/g;

export function uzTypography(text: string): string {
  return text
    .replace(/\.\.\./g, "…")
    .replace(/--/g, "—")
    .replace(OPENING_QUOTE, "$1«")
    .replace(/"/g, "»");
}

/** Remark plugin: Uzbek quotes «», em dashes and ellipses in prose. Code is untouched. */
export function remarkUzTypography() {
  const walk = (node: MdNode) => {
    if (node.type === "text" && node.value !== undefined) node.value = uzTypography(node.value);
    node.children?.forEach(walk);
  };
  return walk;
}
