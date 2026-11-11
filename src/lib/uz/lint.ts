import matter from "gray-matter";
import { splitSegments } from "./segments";
import { checkUzbek, type SpellSuggestion, type TahrirchiOptions } from "./tahrirchi";
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

  try {
    parsePostMeta(matter(source).data as Record<string, unknown>, slug);
  } catch (e) {
    errors.push({ code: "frontmatter", message: e instanceof Error ? e.message : String(e), line: 1 });
  }

  const prose = splitSegments(source).filter((s) => s.kind === "prose");

  const words = opts.protectedWords.filter(Boolean).sort((a, b) => b.length - a.length);
  const protectedAlt = words.length
    ? `(?<!${WORD_LETTER})(?:${words.map(escapeRegExp).join("|")})(?!${WORD_LETTER})|`
    : "";
  const reOg = /(?<!\p{N})[oOgG][ʻ'‘’]/gu;
  const reShCh = new RegExp(`${protectedAlt}[sScC][hH]`, "gu");
  const blacklist = opts.blacklist.filter(Boolean).map((p) => ({ p, re: new RegExp(escapeRegExp(p), "giu") }));

  for (const seg of prose) {
    for (const m of seg.text.matchAll(reOg)) {
      errors.push({
        code: "old-og",
        message: `eski imlo: "${m[0]}" — ö/ğ yozing`,
        line: lineAt(source, seg.start + (m.index ?? 0)),
      });
    }
    for (const m of seg.text.matchAll(reShCh)) {
      if (!/^[sScC][hH]$/.test(m[0])) continue; // protected word match
      warnings.push({
        code: "old-sh-ch",
        message: `eski imlo: "${m[0]}" — ş/ç bölişi mumkin`,
        line: lineAt(source, seg.start + (m.index ?? 0)),
      });
    }
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
        warnings.push({ code: "suspicious", message: `şübhali söz "${s.token}": ${HINT}`, line });
      } else {
        const fix = s.corrections.length ? ` (${s.corrections.slice(0, 3).join(", ")})` : "";
        warnings.push({ code: "spelling", message: `imlo: "${s.token}"${fix}`, line });
      }
    }
  }

  return { errors, warnings };
}
