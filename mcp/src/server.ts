import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createGitHub, GitHubError } from "./github";
import { getGuide } from "./tools/guide";
import { checkUzbek, convertAlphabet } from "./tools/check";
import { publishPost } from "./tools/publish";
import { updatePost } from "./tools/update";
import { ToolError, type ToolDeps } from "./tools/post-file";

export interface ToolEnv {
  GITHUB_TOKEN: string;
  REPO: string;
  TAHRIRCHI_API_KEY?: string;
}

export function tashkentDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export async function toolResult(run: () => Promise<unknown>) {
  try {
    const result = await run();
    return { content: [{ type: "text" as const, text: typeof result === "string" ? result : JSON.stringify(result) }] };
  } catch (error) {
    const status = error instanceof GitHubError ? ` status=${error.status}` : "";
    console.error("tool failed:", error instanceof Error ? `${error.name}: ${error.message}${status}` : "unknown error");
    const message = error instanceof ToolError || error instanceof GitHubError ? error.message : "Xato yüz berdi. Qayta urinib köring.";
    return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ message, issues: error instanceof ToolError ? error.issues : [] }) }] };
  }
}

const guide = "Before writing, call get_guide and follow it.";
const source = z.enum(["claude", "chatgpt"]).describe("Must match the client: claude for Claude, chatgpt for ChatGPT.");
export const fields = {
  title: z.string().max(300), description: z.string().max(500), tags: z.array(z.string().max(50)).max(20), source,
  seed: z.string().max(500).optional(), body: z.string().max(200000),
};
export const slug = z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const mode = z.enum(["direct", "review"]);
export const model = z.string().max(100).optional().describe("Exact model name only if reported by the client; omit if unknown (AI fallback).");

/** Wraps fetch so every request carries `User-Agent: Yozma-MCP`, keeping headers of any shape. */
export function withUserAgent(base: typeof fetch): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "Yozma-MCP");
    return base(input, { ...init, headers });
  };
}

export function createServer(env: ToolEnv) {
  const server = new McpServer({ name: "Yozma", version: "0.1.0" });
  const deps: ToolDeps = {
    gh: createGitHub({ token: env.GITHUB_TOKEN, repo: env.REPO }),
    today: tashkentDate,
    ...(env.TAHRIRCHI_API_KEY ? { tahrirchi: { apiKey: env.TAHRIRCHI_API_KEY, fetch: withUserAgent((input, init) => fetch(input, init)) } } : {}),
  };
  server.registerTool("get_guide", { description: `Read the writing interview, style guide and blacklist first. ${guide}`, inputSchema: {} }, () => toolResult(() => getGuide(deps)));
  server.registerTool("check_uzbek", { description: `Convert and lint Uzbek Markdown, returning errors and warnings. ${guide}`, inputSchema: { markdown: z.string().max(200000) } }, ({ markdown }) => toolResult(() => checkUzbek(deps, markdown)));
  server.registerTool("convert_alphabet", { description: `Convert text to the new Uzbek alphabet, preserving protected words. ${guide}`, inputSchema: { text: z.string().max(200000) } }, ({ text }) => toolResult(() => convertAlphabet(deps, text)));
  server.registerTool("publish_post", {
    description: `Publish a new post. ${guide} Before calling publish_post, ask the author to choose direct publication or review via PR. source must be claude or chatgpt matching the client.`,
    inputSchema: { slug, ...fields, mode, model },
  }, ({ mode, model, ...input }) => toolResult(() => publishPost({ ...deps, model }, input, mode)));
  server.registerTool("update_post", {
    description: `Update a post; an existing review PR is updated automatically, otherwise choose direct or review with the author. ${guide} source must be claude or chatgpt matching the client.`,
    inputSchema: { slug, title: fields.title.optional(), description: fields.description.optional(), tags: fields.tags.optional(), source: source.optional(), seed: fields.seed, body: fields.body.optional(), mode: mode.optional(), model },
  }, ({ mode, model, ...input }) => toolResult(() => updatePost({ ...deps, model }, input, mode)));
  return server;
}
