import fs from "node:fs";
import path from "node:path";
import { parseProtectedWords } from "../src/lib/uz/alphabet";
import { lintPost, parseBlacklist, type Issue } from "../src/lib/uz/lint";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log("Usage: pnpm yozma:check <posts/file.md ...>");
  process.exit(0);
}

const root = process.cwd();
const protectedWords = parseProtectedWords(
  fs.readFileSync(path.join(root, "writing", "protected-words.txt"), "utf8"),
);
const blacklist = parseBlacklist(fs.readFileSync(path.join(root, "writing", "blacklist.md"), "utf8"));
const apiKey = process.env.TAHRIRCHI_API_KEY;
if (!apiKey) console.log("tahrirchi: ötkazib yuborildi (kalit yöq)");

async function main() {
  let errorCount = 0;
  let warningCount = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const slug = path.basename(file, ".md");
    const { errors, warnings } = await lintPost(source, slug, {
      protectedWords,
      blacklist,
      tahrirchi: apiKey ? { apiKey } : undefined,
    });
    const print = (issues: Issue[]) => {
      for (const i of issues) console.log(`${file}:${i.line ?? 1} [${i.code}] ${i.message}`);
    };
    print(errors);
    print(warnings);
    errorCount += errors.length;
    warningCount += warnings.length;
  }
  console.log(`${files.length} fayl, ${errorCount} xato, ${warningCount} ogohlantiriş`);
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
