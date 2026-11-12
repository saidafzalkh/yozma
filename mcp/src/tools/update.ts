import {
  assertSlug,
  commitMessage,
  commitViaPr,
  parseExisting,
  postUrlFor,
  prepareFile,
  REPO_BASE,
  ToolError,
  type ToolDeps,
} from "./post-file";
import type { PostInput, ToolResult } from "./publish";

export async function updatePost(
  deps: ToolDeps,
  input: { slug: string } & Partial<Omit<PostInput, "slug">>,
  mode?: "direct" | "review",
): Promise<ToolResult> {
  assertSlug(input.slug);
  const { slug, ...changes } = input;
  const path = `posts/${slug}.md`;
  const branch = `post/${slug}`;
  const message = commitMessage(`post: update ${slug}`, deps.model);

  const pr = await deps.gh.findOpenPr(branch);
  if (pr) {
    const file = await deps.gh.getFile(path, branch);
    if (!file) throw new ToolError(`${branch} şöbasida ${path} topilmadi`);
    const base = parseExisting(file.content);
    const prepared = await prepareFile(deps, slug, { data: { ...base.data, date: deps.today() }, body: base.body }, changes);
    const { commitUrl } = await deps.gh.putFile({ path, content: prepared.content, message, branch, sha: file.sha });
    if (!(await deps.gh.findOpenPr(branch))) {
      throw new ToolError(
        `review PR yopilgan: özgarişlar ${branch} şöbasiga saqlandi (${commitUrl}). ` +
          `Yangi review öçiş uçun update_post ni qayta işlating yoki mode: direct tanlang`,
      );
    }
    return { url: pr.url, postUrl: postUrlFor(slug), warnings: prepared.warnings };
  }

  const file = await deps.gh.getFile(path, REPO_BASE);
  if (!file) throw new ToolError(`post topilmadi: ${slug}`);
  if (!mode) throw new ToolError("mode kerak: direct yoki review");
  const base = parseExisting(file.content);
  const prepared = await prepareFile(deps, slug, base, changes);
  if (mode === "direct") {
    const { commitUrl } = await deps.gh.putFile({
      path,
      content: prepared.content,
      message,
      branch: REPO_BASE,
      sha: file.sha,
    });
    return { url: commitUrl, postUrl: postUrlFor(slug), warnings: prepared.warnings };
  }
  const url = await commitViaPr(deps, { slug, message, fileSha: file.sha, ...prepared });
  return { url, postUrl: postUrlFor(slug), warnings: prepared.warnings };
}
