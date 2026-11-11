import { splitSegments } from "./segments";
import { toOldAlphabet } from "./alphabet";

const ENDPOINT = "https://websocket.tahrirchi.uz/proofread";
const MAX_CHUNK = 5000;

/** Offsets refer to the text that was passed in (for checkUzbek: the original new-alphabet markdown). */
export interface SpellSuggestion {
  offset: number;
  length: number;
  token: string;
  corrections: string[];
  /** Token as Tahrirchi saw it (old alphabet); set by checkUzbek. */
  oldToken?: string;
}
export interface TahrirchiOptions {
  apiKey: string;
  fetch?: typeof fetch;
}

interface ApiSuggestion {
  offset: number;
  length: number;
  token: string;
  corrections?: string[];
}

interface Chunk {
  start: number;
  text: string;
}

function splitLong(text: string, start: number): Chunk[] {
  const out: Chunk[] = [];
  let pos = 0;
  while (text.length - pos > MAX_CHUNK) {
    let cut = pos + MAX_CHUNK;
    const ws = Math.max(
      text.lastIndexOf(" ", cut),
      text.lastIndexOf("\n", cut),
      text.lastIndexOf("\t", cut),
    );
    if (ws > pos) cut = ws;
    out.push({ start: start + pos, text: text.slice(pos, cut) });
    pos = cut;
  }
  out.push({ start: start + pos, text: text.slice(pos) });
  return out;
}

/** Chunks of at most 5000 chars, split on blank lines (oversized paragraphs on whitespace). */
function chunk(text: string): Chunk[] {
  const out: Chunk[] = [];
  let cur: Chunk | null = null;
  let pos = 0;
  for (const para of text.split("\n\n")) {
    const paraStart = pos;
    pos += para.length + 2;
    if (para.length > MAX_CHUNK) {
      if (cur) out.push(cur);
      cur = null;
      out.push(...splitLong(para, paraStart));
      continue;
    }
    if (cur && cur.text.length + 2 + para.length <= MAX_CHUNK) {
      cur.text += "\n\n" + para;
    } else {
      if (cur) out.push(cur);
      cur = { start: paraStart, text: para };
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Proofread old-alphabet text. Offsets in the result are relative to `text`. */
export async function proofreadOld(text: string, opts: TahrirchiOptions): Promise<SpellSuggestion[]> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const result: SpellSuggestion[] = [];
  for (const c of chunk(text)) {
    if (c.text.trim() === "") continue;
    const res = await doFetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: opts.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: [{ offset: 0, fields: [{ value: c.text, markup: false }] }], ws: 1 }),
    });
    const raw = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const message = (json as { message?: unknown } | undefined)?.message;
      throw new Error(typeof message === "string" ? message : `Tahrirchi HTTP ${res.status}`);
    }
    const data = (json as { data?: ApiSuggestion[] } | undefined)?.data ?? [];
    for (const s of data) {
      result.push({
        offset: c.start + s.offset,
        length: s.length,
        token: s.token,
        corrections: s.corrections ?? [],
      });
    }
  }
  return result;
}

/** Spell-check the prose of a new-alphabet markdown file; offsets refer to `markdown`. */
export async function checkUzbek(markdown: string, opts: TahrirchiOptions): Promise<SpellSuggestion[]> {
  const out: SpellSuggestion[] = [];
  for (const seg of splitSegments(markdown)) {
    if (seg.kind !== "prose" || seg.text.trim() === "") continue;
    const old = toOldAlphabet(seg.text);
    for (const s of await proofreadOld(old.text, opts)) {
      if (s.length <= 0 || s.offset >= old.toNewIndex.length) continue;
      const first = old.toNewIndex[s.offset];
      const last = old.toNewIndex[Math.min(s.offset + s.length, old.toNewIndex.length) - 1];
      out.push({
        offset: seg.start + first,
        length: last + 1 - first,
        token: seg.text.slice(first, last + 1),
        corrections: s.corrections,
        oldToken: old.text.slice(s.offset, s.offset + s.length),
      });
    }
  }
  return out;
}
