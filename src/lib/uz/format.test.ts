import { describe, expect, it } from "vitest";
import { formatEditedDate, formatUzDate, tagSlug } from "@/lib/uz/format";

describe("formatUzDate", () => {
  it("formats day without leading zero, month name, year", () => {
    expect(formatUzDate("2026-11-10")).toBe("10-noyabr, 2026");
    expect(formatUzDate("2025-07-08")).toBe("8-iyul, 2025");
  });
  it("covers every month name", () => {
    const months = [
      "yanvar", "fevral", "mart", "aprel", "may", "iyun",
      "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
    ];
    months.forEach((name, i) => {
      const mm = String(i + 1).padStart(2, "0");
      expect(formatUzDate(`2026-${mm}-01`)).toBe(`1-${name}, 2026`);
    });
  });
  it("rejects invalid months and days", () => {
    expect(() => formatUzDate("2025-13-01")).toThrow();
    expect(() => formatUzDate("2025-00-10")).toThrow();
    expect(() => formatUzDate("2025-02-29")).toThrow();
    expect(() => formatUzDate("2025-04-31")).toThrow();
    expect(() => formatUzDate("not-a-date")).toThrow();
  });
  it("accepts leap day in a leap year", () => {
    expect(formatUzDate("2024-02-29")).toBe("29-fevral, 2024");
  });
});

describe("tagSlug", () => {
  it("transliterates Uzbek letters to ASCII", () => {
    expect(tagSlug("dasturlaş")).toBe("dasturlas");
    expect(tagSlug("öğiş çoy")).toBe("ogis-coy");
  });
  it("drops tutuq and apostrophe variants", () => {
    expect(tagSlug("Sunʼiy intellekt")).toBe("suniy-intellekt");
    expect(tagSlug("oʻg'il ` ‘’")).toBe("ogil");
  });
  it("lowercases and collapses separators", () => {
    expect(tagSlug("  Yangi   Ilm!!  ")).toBe("yangi-ilm");
  });
  it("handles dotted capital I", () => {
    expect(tagSlug("\u0130stanbul")).toBe("istanbul");
  });
  it("throws when the slug would be empty, naming the tag", () => {
    expect(() => tagSlug("---")).toThrow(/---/);
    expect(() => tagSlug("\u02BB")).toThrow();
    expect(() => tagSlug("\u040E\u0437\u0431\u0435\u043A")).toThrow(/\u040E/);
  });
});

describe("formatUzDate withYear", () => {
  it("omits the year on request", () => {
    expect(formatUzDate("2026-11-11", { withYear: false })).toBe("11-noyabr");
    expect(formatUzDate("2026-11-11", { withYear: true })).toBe("11-noyabr, 2026");
  });
});

describe("formatEditedDate", () => {
  it("drops the year when edited in the publish year", () => {
    expect(formatEditedDate("2026-11-11", "2026-11-10")).toBe("11-noyabr");
  });
  it("keeps the full date when the year differs", () => {
    expect(formatEditedDate("2027-01-05", "2026-11-10")).toBe("5-yanvar, 2027");
  });
});
