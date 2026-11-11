// Pure helpers that assemble a post file and run the shared conversion + lint pipeline.
import yaml from "js-yaml";
import { parseProtectedWords, toNewAlphabet } from "../../../src/lib/uz/alphabet";
import { convertFrontmatterFields, splitFrontmatter } from "../../../src/lib/uz/frontmatter";
import { lintPost, parseBlacklist, type Issue } from "../../../src/lib/uz/lint";
import type { GitHub } from "../github";

export const AUTHOR = "Saidafzal Kholkhujaev";
export const REPO_BASE = "main";
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ToolDeps {
  gh: GitHub;
  today: () => string;
  tahrirchi?: { apiKey: string; fetch?: typeof fetch };
  model?: string;
}

export class ToolError extends Error {
  issues: Issue[];
  constructor(message: string, issues: Issue[] = []) {
    super(message);
    this.name = "ToolError";
    this.issues = issues;
  }
}

const KEY_ORDER = ["title", "date", "author", "description", "source", "seed", "tags"];

/** `---\n<yaml>---\n\n<body>\n`; known keys first (in a fixed order), unknown keys after. */
export function buildPostFile(data: Record<string, unknown>, body: string): string {
  const ordered: Record<string, unknown> = {};
  for (const k of KEY_ORDER) if (data[k] !== undefined) ordered[k] = data[k];
  for (const k of Object.keys(data)) if (!(k in ordered) && data[k] !== undefined) ordered[k] = data[k];
  const fm = yaml.safeDump(ordered, { schema: yaml.CORE_SCHEMA, lineWidth: -1 });
  return `---\n${fm}---\n\n${body.replace(/^\s*\n/, "").replace(/\s+$/, "")}\n`;
}

export async function readWriting(gh: GitHub, name: string): Promise<string | null> {
  const f = await gh.getFile(`writing/${name}`, REPO_BASE);
  return f ? f.content : null;
}

export async function loadLists(gh: GitHub): Promise<{ protectedWords: string[]; blacklist: string[] }> {
  const [pw, bl] = await Promise.all([readWriting(gh, "protected-words.txt"), readWriting(gh, "blacklist.md")]);
  return { protectedWords: pw ? parseProtectedWords(pw) : [], blacklist: bl ? parseBlacklist(bl) : [] };
}

export function assertSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new ToolError(`slug notöğri: "${slug}" (faqat kiçik lotin harflar, raqamlar va defis)`);
  }
}

export const commitMessage = (subject: string, model?: string) =>
  `${subject}\n\nCo-Authored-By: ${model ?? "AI"} via Yozma MCP`;

export const postUrlFor = (slug: string) => `https://yozma.uz/${slug}`;

export interface PostFields {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
  seed?: string;
}

/**
 * Applies `fields` and `body` over `data`/`oldBody` (converted to the new alphabet), builds the
 * file, lints it and throws a ToolError carrying the lint errors if any. Returns the file + warnings.
 */
export async function prepareFile(
  deps: ToolDeps,
  slug: string,
  base: { data: Record<string, unknown>; body: string },
  changes: PostFields & { body?: string },
): Promise<{ content: string; warnings: Issue[]; description: string; title: string }> {
  const { protectedWords, blacklist } = await loadLists(deps.gh);
  const incoming: Record<string, unknown> = {};
  for (const k of ["title", "description", "tags", "source", "seed"] as const) {
    if (changes[k] !== undefined) incoming[k] = changes[k];
  }
  const data = { ...base.data, ...convertFrontmatterFields(incoming, protectedWords) };
  const body = changes.body !== undefined ? toNewAlphabet(changes.body, protectedWords) : base.body;
  const content = buildPostFile(data, body);
  const { errors, warnings } = await lintPost(content, slug, {
    protectedWords,
    blacklist,
    tahrirchi: deps.tahrirchi,
  });
  if (errors.length) {
    throw new ToolError(`post tekşiruvdan ötmadi, hiç nima saqlanmadi (${errors.length} xato)`, errors);
  }
  return {
    content,
    warnings,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
  };
}

export function prBody(description: string, warnings: Issue[]): string {
  const list = warnings.length
    ? warnings.map((w) => `- ${w.line ? `${w.line}-qator: ` : ""}${w.message}`).join("\n")
    : "Ogohlantiriş yöq.";
  return `${description}\n\n${list}\n`;
}

export function parseExisting(content: string): { data: Record<string, unknown>; body: string } {
  const fm = splitFrontmatter(content);
  return { data: fm.data, body: fm.body.replace(/^\s*\n/, "").replace(/\s+$/, "") };
}

/** Creates `post/<slug>` from main, commits `content`, opens a labelled PR. */
export async function commitViaPr(
  deps: ToolDeps,
  p: { slug: string; content: string; message: string; title: string; description: string; warnings: Issue[]; fileSha?: string },
): Promise<string> {
  const branch = `post/${p.slug}`;
  if (await deps.gh.getBranchSha(branch)) {
    throw new ToolError(`"${branch}" şöbasi allaqaçon bor`);
  }
  const mainSha = await deps.gh.getBranchSha(REPO_BASE);
  if (!mainSha) throw new ToolError("main şöbasi topilmadi");
  await deps.gh.createBranch(branch, mainSha);
  await deps.gh.putFile({
    path: `posts/${p.slug}.md`,
    content: p.content,
    message: p.message,
    branch,
    sha: p.fileSha,
  });
  const pr = await deps.gh.createPr({
    head: branch,
    base: REPO_BASE,
    title: `Post: ${p.title}`,
    body: prBody(p.description, p.warnings),
    labels: ["post"],
  });
  return pr.url;
}
