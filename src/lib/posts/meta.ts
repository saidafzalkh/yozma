export type PostSource = "claude" | "chatgpt";
export type PostStatus = "draft" | "published";

export interface PostMeta {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  author: string;
  tags: string[];
  source?: PostSource;
  status: PostStatus;
  updated?: string; // YYYY-MM-DD
}

export interface Post extends PostMeta {
  editedDate?: string;
  body: string;
}

export class PostMetaError extends Error {
  constructor(slug: string, message: string) {
    super(`posts/${slug}.md: ${message}`);
    this.name = "PostMetaError";
  }
}

const DEFAULT_AUTHOR = "Saidafzal Kholkhujaev";

function toIsoDate(value: unknown, field: string, slug: string): string {
  let iso: string;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new PostMetaError(slug, `invalid ${field}`);
    // gray-matter parses `2025-07-08` as UTC midnight.
    const y = String(value.getUTCFullYear()).padStart(4, "0");
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    iso = `${y}-${m}-${d}`;
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    iso = value.trim();
    const dt = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso) {
      throw new PostMetaError(slug, `invalid ${field}: ${iso}`);
    }
  } else {
    throw new PostMetaError(slug, `${field} must be a YYYY-MM-DD date`);
  }
  return iso;
}

function requireString(data: Record<string, unknown>, field: string, slug: string): string {
  const v = data[field];
  if (typeof v !== "string" || v.trim() === "") {
    throw new PostMetaError(slug, `missing ${field}`);
  }
  return v.trim();
}

/** Pure validation of frontmatter data; no Node APIs (reused by a Worker). */
export function parsePostMeta(data: Record<string, unknown>, slug: string): PostMeta {
  const title = requireString(data, "title", slug);
  const date = toIsoDate(data.date, "date", slug);

  const source = data.source;
  if (source !== undefined && source !== "claude" && source !== "chatgpt") {
    throw new PostMetaError(slug, `invalid source: ${String(source)}`);
  }

  const status = data.status ?? "published";
  if (status !== "draft" && status !== "published") {
    throw new PostMetaError(slug, `invalid status: ${String(status)}`);
  }

  const rawTags = data.tags ?? data.keywords ?? [];
  if (!Array.isArray(rawTags) || rawTags.some((t) => typeof t !== "string")) {
    throw new PostMetaError(slug, "tags must be a list of strings");
  }
  const tags = (rawTags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean);

  const meta: PostMeta = {
    slug,
    title,
    date,
    description: typeof data.description === "string" ? data.description : "",
    author: typeof data.author === "string" && data.author.trim() ? data.author.trim() : DEFAULT_AUTHOR,
    tags,
    status,
  };
  if (source !== undefined) meta.source = source;
  if (data.updated !== undefined) meta.updated = toIsoDate(data.updated, "updated", slug);
  return meta;
}
