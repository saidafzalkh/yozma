import { readWriting, ToolError, type ToolDeps } from "./post-file";

/** writing/interview.md + style.md + blacklist.md from main. */
export async function getGuide(deps: ToolDeps): Promise<string> {
  const [interview, style, blacklist] = await Promise.all(
    ["interview.md", "style.md", "blacklist.md"].map((n) => readWriting(deps.gh, n)),
  );
  if (interview === null) throw new ToolError("writing/interview.md topilmadi");
  if (style === null) throw new ToolError("writing/style.md topilmadi");
  const parts = [interview.trim(), style.trim()];
  if (blacklist) parts.push(blacklist.trim());
  return parts.join("\n\n---\n\n") + "\n";
}
