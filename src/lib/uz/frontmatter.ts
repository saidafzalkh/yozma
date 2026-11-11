import yaml from "js-yaml";
import { toNewAlphabet } from "./alphabet";

const OPEN = /^---[ \t]*\r?\n/;
const CLOSE = /^---[ \t]*(?:\r?\n|$)/gm;

/**
 * Splits a leading `--- … ---` YAML block from markdown. No frontmatter at the file start
 * (or no closing fence) gives `{data: {}, body: source, bodyStart: 0}`. Invalid YAML throws.
 */
export function splitFrontmatter(source: string): { data: Record<string, unknown>; body: string; bodyStart: number } {
  const none = { data: {}, body: source, bodyStart: 0 };
  const open = OPEN.exec(source);
  if (!open) return none;
  const re = new RegExp(CLOSE);
  re.lastIndex = open[0].length;
  const close = re.exec(source);
  if (!close) return none;
  const bodyStart = close.index + close[0].length;
  const loaded = yaml.safeLoad(source.slice(open[0].length, close.index), { schema: yaml.CORE_SCHEMA }) as unknown;
  if (loaded === undefined || loaded === null) return { data: {}, body: source.slice(bodyStart), bodyStart };
  if (typeof loaded !== "object" || Array.isArray(loaded) || loaded instanceof Date) {
    throw new Error("frontmatter must be a YAML mapping");
  }
  return { data: loaded as Record<string, unknown>, body: source.slice(bodyStart), bodyStart };
}

/** Converts string `title`, `description`, `seed` and each string entry of `tags` to the new alphabet. */
export function convertFrontmatterFields(
  data: Record<string, unknown>,
  protectedWords: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const key of ["title", "description", "seed"]) {
    const v = out[key];
    if (typeof v === "string") out[key] = toNewAlphabet(v, protectedWords);
  }
  if (Array.isArray(out.tags)) {
    out.tags = out.tags.map((t: unknown) => (typeof t === "string" ? toNewAlphabet(t, protectedWords) : t));
  }
  return out;
}
