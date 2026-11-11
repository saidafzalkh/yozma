import { describe, expect, it } from "vitest";
import { formatUzDate, tagSlug } from "@/lib/uz/format";

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
});
