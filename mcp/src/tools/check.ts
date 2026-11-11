import { toNewAlphabet } from "../../../src/lib/uz/alphabet";
import { lintPost, type Issue } from "../../../src/lib/uz/lint";
import { loadLists, type ToolDeps } from "./post-file";

export async function convertAlphabet(deps: ToolDeps, text: string): Promise<string> {
  const { protectedWords } = await loadLists(deps.gh);
  return toNewAlphabet(text, protectedWords);
}

/**
 * Converts to the new alphabet, then lints a synthetic post (minimal frontmatter around the body)
 * so frontmatter errors cannot mask body issues. Line numbers are relative to the body.
 */
export async function checkUzbek(
  deps: ToolDeps,
  markdown: string,
): Promise<{ converted: string; errors: Issue[]; warnings: Issue[] }> {
  const { protectedWords, blacklist } = await loadLists(deps.gh);
  const converted = toNewAlphabet(markdown, protectedWords);
  const header = `---\ntitle: Tekşiruv\ndate: ${deps.today()}\n---\n\n`;
  const offset = header.split("\n").length - 1;
  const res = await lintPost(header + converted, "tekshiruv", { protectedWords, blacklist, tahrirchi: deps.tahrirchi });
  const shift = (i: Issue): Issue => (i.line === undefined ? i : { ...i, line: i.line - offset });
  return { converted, errors: res.errors.map(shift), warnings: res.warnings.map(shift) };
}
