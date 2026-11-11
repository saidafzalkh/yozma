import { splitSegments } from "./segments";

const TUTUQ = "ʼ"; // ʼ
const APOS = "\u02BB'\u2018\u2019"; // ʻ ' ‘ ’ (backtick is markdown code, not an apostrophe)

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const UPPER_NEW: Record<string, string> = { o: "Ö", g: "Ğ", s: "Ş", c: "Ç" };
const LOWER_NEW: Record<string, string> = { o: "ö", g: "ğ", s: "ş", c: "ç" };

function convertProse(prose: string, protectedWords: readonly string[]): string {
  const words = [...protectedWords].filter(Boolean).sort((a, b) => b.length - a.length);
  const protectedAlt = words.length
    ? `(?<!\\p{L})(?:${words.map(escapeRegExp).join("|")})(?!\\p{L})|`
    : "";
  const re = new RegExp(
    `${protectedAlt}` +
      `(?<!\\p{N})([oOgG])[${APOS}]|` + // o'/g' -> ö/ğ
      `([sScC])[hH]|` + // sh/ch -> ş/ç
      `(?<=\\p{L})[${APOS}](?=\\p{L})`, // tutuq
    "gu",
  );
  return prose.replace(re, (m, og: string | undefined, shch: string | undefined) => {
    if (og) return (og === og.toUpperCase() ? UPPER_NEW : LOWER_NEW)[og.toLowerCase()];
    if (shch) return (shch === shch.toUpperCase() ? UPPER_NEW : LOWER_NEW)[shch.toLowerCase()];
    if (m.length === 1 && APOS.includes(m)) return TUTUQ;
    return m; // protected word
  });
}

export function toNewAlphabet(text: string, protectedWords: readonly string[]): string {
  return splitSegments(text)
    .map((s) => (s.kind === "prose" ? convertProse(s.text, protectedWords) : s.text))
    .join("");
}

const OLD: Record<string, [lower: string, title: string, upper: string]> = {
  ö: ["oʻ", "Oʻ", "Oʻ"],
  Ö: ["oʻ", "Oʻ", "Oʻ"],
  ğ: ["gʻ", "Gʻ", "Gʻ"],
  Ğ: ["gʻ", "Gʻ", "Gʻ"],
  ş: ["sh", "Sh", "SH"],
  Ş: ["sh", "Sh", "SH"],
  ç: ["ch", "Ch", "CH"],
  Ç: ["ch", "Ch", "CH"],
};

const isUpperLetter = (c: string | undefined): boolean =>
  c !== undefined && c !== c.toLowerCase() && c === c.toUpperCase();

export function toOldAlphabet(text: string): { text: string; toNewIndex: number[] } {
  let out = "";
  const toNewIndex: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const entry = OLD[ch];
    if (!entry) {
      out += ch;
      toNewIndex.push(i);
      continue;
    }
    let rep: string;
    if (ch === ch.toLowerCase()) rep = entry[0];
    else rep = isUpperLetter(text[i - 1]) || isUpperLetter(text[i + 1]) ? entry[2] : entry[1];
    for (let k = 0; k < rep.length; k++) toNewIndex.push(i);
    out += rep;
  }
  return { text: out, toNewIndex };
}

export function parseProtectedWords(fileContent: string): string[] {
  return fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}
