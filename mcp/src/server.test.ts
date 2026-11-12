import { expect, it } from "vitest";
import { fields, tashkentDate, toolResult } from "./server";
import { ToolError } from "./tools/post-file";

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
