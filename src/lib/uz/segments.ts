export type Segment = { kind: "prose" | "protected"; text: string; start: number };

// Inline protected constructs, leftmost match wins:
// inline code, link target `](...)`, URL, HTML tag.
const INLINE_PROTECTED =
  /(?<!`)(`+)(?!`)[\s\S]+?(?<!`)\1(?!`)|\]\((?:[^()\s]|\([^()]*\))*\)|https?:\/\/\S+|<\/?[A-Za-z!][^>]*>/g;

type Range = [start: number, end: number];

function frontmatterEnd(md: string): number {
  const open = /^---[ \t]*\r?\n/.exec(md);
  if (!open) return 0;
  const re = /^---[ \t]*(?:\r?\n|$)/gm;
  re.lastIndex = open[0].length;
  const close = re.exec(md);
  return close ? close.index + close[0].length : 0;
}

function fencedRanges(md: string, from: number): Range[] {
  const ranges: Range[] = [];
  let pos = from;
  let open: { start: number; char: string; len: number } | null = null;
  while (pos < md.length) {
    const nl = md.indexOf("\n", pos);
    const end = nl === -1 ? md.length : nl + 1;
    const line = md.slice(pos, end);
    if (!open) {
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (m) open = { start: pos, char: m[1][0], len: m[1].length };
    } else {
      const m = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?\n?$/.exec(line);
      if (m && m[1][0] === open.char && m[1].length >= open.len) {
        ranges.push([open.start, end]);
        open = null;
      }
    }
    pos = end;
  }
  if (open) ranges.push([open.start, md.length]);
  return ranges;
}

const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;
const INDENTED = /^(?: {4}|\t)/;
const REF_DEF = /^ {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*(?:<[^>\n]*>|\S+)/;

/**
 * Fenced blocks plus indented code blocks (after a blank line, outside list items) and the
 * `[label]: destination` part of link reference definitions. Sorted, non-overlapping.
 */
function blockRanges(md: string, from: number): Range[] {
  const fenced = fencedRanges(md, from);
  const ranges: Range[] = [];
  let fi = 0;
  let prevBlank = true;
  let inList = false;
  let inCode = false;
  let pos = from;
  while (pos < md.length) {
    const nl = md.indexOf("\n", pos);
    const end = nl === -1 ? md.length : nl + 1;
    if (fi < fenced.length && pos >= fenced[fi][0]) {
      ranges.push(fenced[fi]);
      pos = fenced[fi][1];
      fi++;
      prevBlank = false;
      inList = false;
      inCode = false;
      continue;
    }
    const line = md.slice(pos, end);
    if (line.trim() === "") {
      prevBlank = true;
    } else if (INDENTED.test(line) && inList) {
      prevBlank = false; // list item continuation
    } else if (INDENTED.test(line) && (prevBlank || inCode)) {
      ranges.push([pos, end]);
      inCode = true;
      prevBlank = false;
    } else {
      inCode = false;
      const item = LIST_ITEM.test(line);
      inList = item || (inList && !prevBlank);
      prevBlank = false;
      const def = REF_DEF.exec(line);
      if (def) ranges.push([pos, pos + def[0].length]);
    }
    pos = end;
  }
  return ranges;
}

export function splitSegments(markdown: string): Segment[] {
  const out: Segment[] = [];
  const push = (kind: Segment["kind"], start: number, end: number) => {
    if (end <= start) return;
    const text = markdown.slice(start, end);
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text, start });
  };

  const fmEnd = frontmatterEnd(markdown);
  push("protected", 0, fmEnd);

  let cursor = fmEnd;
  const pushProse = (from: number, to: number) => {
    const chunk = markdown.slice(from, to);
    let last = 0;
    const re = new RegExp(INLINE_PROTECTED);
    for (let m = re.exec(chunk); m; m = re.exec(chunk)) {
      const end = m.index + m[0].length;
      push("prose", from + last, from + m.index);
      push("protected", from + m.index, from + end);
      last = end;
    }
    push("prose", from + last, to);
  };

  for (const [s, e] of blockRanges(markdown, fmEnd)) {
    pushProse(cursor, s);
    push("protected", s, e);
    cursor = e;
  }
  pushProse(cursor, markdown.length);
  return out;
}
