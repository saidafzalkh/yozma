import type { Issue } from "../../../src/lib/uz/lint";
import {
  assertSlug,
  AUTHOR,
  commitMessage,
  commitViaPr,
  postUrlFor,
  prepareFile,
  REPO_BASE,
  ToolError,
  type ToolDeps,
} from "./post-file";

export type PostInput = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  source: "claude" | "chatgpt";
  seed?: string;
  body: string;
};

export type ToolResult = { url: string; postUrl: string; warnings: Issue[] };

export async function publishPost(deps: ToolDeps, input: PostInput, mode: "direct" | "review"): Promise<ToolResult> {
  assertSlug(input.slug);
  const path = `posts/${input.slug}.md`;
  if (await deps.gh.getFile(path, REPO_BASE)) {
    throw new ToolError(`bu slug band, update_post ni işlating: ${input.slug}`);
  }
  const { slug, body, ...fields } = input;
  const prepared = await prepareFile(
    deps,
    slug,
    { data: { date: deps.today(), author: AUTHOR }, body: "" },
    { ...fields, body },
  );
  const message = commitMessage(`post: ${slug}`, deps.model);
  if (mode === "direct") {
    const { commitUrl } = await deps.gh.putFile({ path, content: prepared.content, message, branch: REPO_BASE });
    return { url: commitUrl, postUrl: postUrlFor(slug), warnings: prepared.warnings };
  }
  const url = await commitViaPr(deps, { slug, message, ...prepared });
  return { url, postUrl: postUrlFor(slug), warnings: prepared.warnings };
}
