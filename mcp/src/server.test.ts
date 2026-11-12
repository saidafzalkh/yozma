import { expect, it, vi } from "vitest";
import { fields, tashkentDate, toolResult } from "./server";
import { ToolError } from "./tools/post-file";
import { GitHubError } from "./github";

it("uses the next Tashkent calendar day after UTC midnight offset", () => {
  expect(tashkentDate(new Date("2026-11-11T20:30:00Z"))).toBe("2026-11-12");
  expect(tashkentDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
});
it("returns lint issues with the Uzbek error message", async () => {
  const issues = [{ code: "frontmatter" as const, message: "xato", severity: "error" as const }];
  const result = await toolResult(async () => { throw new ToolError("Tekşiruvdan ötmadi", issues); });
  expect(result.isError).toBe(true);
  expect(JSON.parse(result.content[0].text)).toEqual({ message: "Tekşiruvdan ötmadi", issues });
});
it("rejects over-long tool inputs", () => {
  expect(fields.title.safeParse("a".repeat(301)).success).toBe(false);
  expect(fields.title.safeParse("a".repeat(300)).success).toBe(true);
});
it("logs name, message and status without secrets", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const result = await toolResult(async () => { throw new GitHubError(403, "forbidden thing"); });
  const logged = spy.mock.calls.flat().join(" ");
  spy.mockRestore();
  expect(result.isError).toBe(true);
  expect(logged).toContain("GitHubError");
  expect(logged).toContain("forbidden thing");
  expect(logged).toContain("403");
});
