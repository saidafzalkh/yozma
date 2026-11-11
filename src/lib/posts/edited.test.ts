import { describe, expect, it } from "vitest";
import { computeEditedDate } from "./edited";

const c = (date: string, skip = false) => ({ date, skip });

describe("computeEditedDate", () => {
  it("undefined for no commits or a single commit", () => {
    expect(computeEditedDate([])).toBeUndefined();
    expect(computeEditedDate([c("2025-07-08")])).toBeUndefined();
  });
  it("returns newest edit date", () => {
    expect(computeEditedDate([c("2026-11-11"), c("2025-07-08")])).toBe("2026-11-11");
  });
  it("undefined when edit is the same day as the first commit", () => {
    expect(computeEditedDate([c("2025-07-08"), c("2025-07-08")])).toBeUndefined();
  });
  it("skips mechanical commits", () => {
    expect(computeEditedDate([c("2026-03-01", true), c("2026-01-02"), c("2025-07-08")])).toBe("2026-01-02");
  });
  it("undefined when all edits are skipped", () => {
    expect(computeEditedDate([c("2026-03-01", true), c("2026-01-02", true), c("2025-07-08")])).toBeUndefined();
  });
  it("override always wins", () => {
    expect(computeEditedDate([], "2026-05-05")).toBe("2026-05-05");
    expect(computeEditedDate([c("2026-03-01", true), c("2025-07-08")], "2026-05-05")).toBe("2026-05-05");
  });
});
