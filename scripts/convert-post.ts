import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseProtectedWords, toNewAlphabet } from "../src/lib/uz/alphabet";

const file = process.argv[2];
if (!file) {
  console.error("Usage: pnpm yozma:convert <file>");
  process.exit(1);
}

const words = parseProtectedWords(
  fs.readFileSync(path.join(process.cwd(), "writing", "protected-words.txt"), "utf8"),
);
const parsed = matter(fs.readFileSync(file, "utf8"));
const data: Record<string, unknown> = { ...parsed.data };

for (const key of ["title", "description"]) {
  const v = data[key];
  if (typeof v === "string") data[key] = toNewAlphabet(v, words);
}
if (Array.isArray(data.tags)) {
  data.tags = data.tags.map((t) => (typeof t === "string" ? toNewAlphabet(t, words) : t));
}
// js-yaml would serialise a Date as an ISO timestamp; keep YYYY-MM-DD.
for (const key of ["date", "updated"]) {
  const v = data[key];
  if (v instanceof Date) data[key] = v.toISOString().slice(0, 10);
}

fs.writeFileSync(file, matter.stringify(toNewAlphabet(parsed.content, words), data));
