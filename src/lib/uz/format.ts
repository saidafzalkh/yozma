const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

// Tutuq and apostrophe variants are dropped, not turned into separators.
const SLUG_DROP = /[ʼʻ'‘’`]/g;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** Formats a YYYY-MM-DD string as "D-month, YYYY" in Uzbek. Pure string math, no Date or timezone. */
export function formatUzDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) throw new Error(`Invalid month in date: ${date}`);
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`Invalid day in date: ${date}`);
  return `${day}-${MONTHS[month - 1]}, ${year}`;
}

/**
 * URL-safe ASCII slug for a tag, e.g. "dasturlaş" -> "dasturlas".
 * Throws if nothing ASCII-alphanumeric remains, so a broken /teg/ URL cannot be built.
 */
export function tagSlug(tag: string): string {
  const slug = tag
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(SLUG_DROP, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "") throw new Error(`tagSlug: empty slug for tag "${tag}"`);
  return slug;
}
