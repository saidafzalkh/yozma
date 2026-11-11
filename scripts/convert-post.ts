import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseProtectedWords, toNewAlphabet } from "../src/lib/uz/alphabet";
import { convertFrontmatterFields } from "../src/lib/uz/frontmatter";

const file = process.argv[2];
if (!file) {
  console.error("Usage: pnpm yozma:convert <file>");
  process.exit(1);
}

const words = parseProtectedWords(
  fs.readFileSync(path.join(process.cwd(), "writing", "protected-words.txt"), "utf8"),
);
const parsed = matter(fs.readFileSync(file, "utf8"));
const data = convertFrontmatterFields(parsed.data as Record<string, unknown>, words);
// js-yaml would serialise a Date as an ISO timestamp; keep YYYY-MM-DD.
for (const key of ["date", "updated"]) {
  const v = data[key];
  if (v instanceof Date) data[key] = v.toISOString().slice(0, 10);
}

fs.writeFileSync(file, matter.stringify(toNewAlphabet(parsed.content, words), data));
