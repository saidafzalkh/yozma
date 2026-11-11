import { splitSegments } from "./segments";
import { checkUzbek, type SpellSuggestion, type TahrirchiOptions } from "./tahrirchi";
import { splitFrontmatter } from "./frontmatter";
import { parsePostMeta } from "../posts/meta";

export type IssueCode = "frontmatter" | "old-og" | "old-sh-ch" | "blacklist" | "spelling" | "suspicious" | "tahrirchi";
export interface Issue {
  code: IssueCode;
  message: string;
  line?: number;
}
export interface LintOptions {
  protectedWords: string[];
  blacklist: string[];
  tahrirchi?: TahrirchiOptions;
}

const HINT = "kod sifatida yozing yoki protected-words.txt ga qöşing";
const WORD_LETTER = "(?:(?![\\u02BB\\u02BC])\\p{L})";

export function parseBlacklist(md: string): string[] {
  return md
    .split(/\r?\n/)
    .map((l) => /^\s*-\s+(.+?)\s*$/.exec(l)?.[1])
    .filter((p): p is string => !!p);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The whole word containing the character at `index` (letters, digits and apostrophe-like marks). */
function wordAround(text: string, index: number): string {
  const isWord = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}ʻʼ'‘’]/u.test(c);
  let a = index;
  let b = index;
  while (isWord(text[a - 1])) a--;
  while (isWord(text[b])) b++;
  return text.slice(a, b);
}

function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) if (source[i] === "\n") line++;
  return line;
}

export function lintPost(
  source: string,
  slug: string,
  opts: LintOptions,
): Promise<{ errors: Issue[]; warnings: Issue[] }> {
  return lint(source, slug, opts);
}

async function lint(source: string, slug: string, opts: LintOptions) {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  let fmData: Record<string, unknown> = {};
  let fmEnd = 0;
  try {
    const fm = splitFrontmatter(source);
    fmData = fm.data;
    fmEnd = fm.bodyStart;
    parsePostMeta(fm.data, slug);
  } catch (e) {
    errors.push({ code: "frontmatter", message: e instanceof Error ? e.message : String(e), line: 1 });
  }

  const prose = splitSegments(source).filter((s) => s.kind === "prose");

  const words = opts.protectedWords.filter(Boolean).sort((a, b) => b.length - a.length);
  const protectedAlt = words.length
    ? `(?<!${WORD_LETTER})(?:${words.map(escapeRegExp).join("|")})\\p{Ll}*|`
    : "";
  const reOg = /(?<!\p{N})[oOgG][ʻ'‘’]/gu;
  const reShCh = new RegExp(`${protectedAlt}[sScC][hH]`, "gu");
  const blacklist = opts.blacklist.filter(Boolean).map((p) => ({ p, re: new RegExp(escapeRegExp(p), "giu") }));

  const scanSpelling = (text: string, prefix: string, lineOf: (index: number) => number | undefined) => {
    for (const m of text.matchAll(reOg)) {
      errors.push({
        code: "old-og",
        message: `${prefix}eski imlo: "${m[0]}" — ö/ğ yozing`,
        line: lineOf(m.index ?? 0),
      });
    }
    for (const m of text.matchAll(reShCh)) {
      if (!/^[sScC][hH]$/.test(m[0])) continue; // protected word match
      const at = m.index ?? 0;
      warnings.push({
        code: "old-sh-ch",
        message: `${prefix}eski imlo: "${wordAround(text, at)}" — ş/ç bölişi mumkin`,
        line: lineOf(at),
      });
    }
  };

  // Frontmatter is a protected segment, so title, description and tags are scanned separately.
  const fmLines = source.slice(0, fmEnd).split("\n");
  const fmLine = (value: string, key: string): number | undefined => {
    let i = fmLines.findIndex((l) => l.includes(value));
    if (i < 0) i = fmLines.findIndex((l) => l.startsWith(`${key}:`));
    return i < 0 ? undefined : i + 1;
  };
  for (const key of ["title", "description"]) {
    const v = fmData[key];
    if (typeof v === "string") scanSpelling(v, `${key}: `, () => fmLine(v, key));
  }
  if (Array.isArray(fmData.tags)) {
    for (const t of fmData.tags) if (typeof t === "string") scanSpelling(t, "tags: ", () => fmLine(t, "tags"));
  }

  for (const seg of prose) {
    scanSpelling(seg.text, "", (i) => lineAt(source, seg.start + i));
    for (const { p, re } of blacklist) {
      for (const m of seg.text.matchAll(re)) {
        warnings.push({
          code: "blacklist",
          message: `taqiqlangan ibora: "${p}"`,
          line: lineAt(source, seg.start + (m.index ?? 0)),
        });
      }
    }
  }

  if (opts.tahrirchi) {
    let suggestions: SpellSuggestion[] = [];
    try {
      suggestions = await checkUzbek(source, opts.tahrirchi);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push({ code: "tahrirchi", message: `tahrirchi: tekşirib bölmadi — ${reason}` });
    }
    for (const s of suggestions) {
      const line = lineAt(source, s.offset);
      if (/sh|ch/i.test(s.oldToken ?? "")) {
        const fix = s.corrections.length ? ` (${s.corrections.slice(0, 3).join(", ")})` : "";
        warnings.push({ code: "suspicious", message: `şubhali söz "${s.token}"${fix}: ${HINT}`, line });
      } else {
        const fix = s.corrections.length ? ` (${s.corrections.slice(0, 3).join(", ")})` : "";
        warnings.push({ code: "spelling", message: `imlo: "${s.token}"${fix}`, line });
      }
    }
  }

  return { errors, warnings };
}
