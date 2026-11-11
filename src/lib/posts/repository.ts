import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { tagSlug } from "@/lib/uz/format";
import { computeEditedDate } from "./edited";
import { readCommits } from "./git";
import { parsePostMeta, PostMetaError, type Post } from "./meta";

// CORE_SCHEMA keeps `date: 2025-07-08` a string (no Date coercion, so impossible dates are caught by parsePostMeta).
const matterOptions = { engines: { yaml: (s: string) => yaml.safeLoad(s, { schema: yaml.CORE_SCHEMA }) as object } };

const defaultDir = () => path.join(process.cwd(), "posts");

function loadPost(file: string, dir: string): Post {
  const slug = file.replace(/\.md$/, "");
  const filePath = path.join(dir, file);
  const { data, content } = matter(fs.readFileSync(filePath, "utf-8"), matterOptions);
  const meta = parsePostMeta(data, slug);
  const editedDate = computeEditedDate(readCommits(filePath), meta.date, meta.updated);
  return { ...meta, ...(editedDate ? { editedDate } : {}), body: content };
}

function loadAll(dir: string): Post[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return loadPost(f, dir);
      } catch (e) {
        if (e instanceof PostMetaError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(msg.startsWith(`posts/${f}: `) ? msg : `posts/${f}: ${msg}`);
      }
    });
}

export function getPublishedPosts(dir: string = defaultDir()): Post[] {
  return loadAll(dir)
    .filter((p) => p.status === "published")
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string, dir: string = defaultDir()): Post | null {
  const file = `${slug}.md`;
  if (!/^[\w-]+$/.test(slug) || !fs.existsSync(path.join(dir, file))) return null;
  const post = loadPost(file, dir);
  return post.status === "published" ? post : null;
}

export function getAllTags(dir: string = defaultDir()): { tag: string; slug: string; posts: Post[] }[] {
  const groups = new Map<string, { tag: string; slug: string; posts: Post[] }>();
  for (const post of getPublishedPosts(dir)) {
    for (const tag of post.tags) {
      const slug = tagSlug(tag);
      const g = groups.get(slug) ?? { tag, slug, posts: [] };
      if (!g.posts.includes(post)) g.posts.push(post);
      groups.set(slug, g);
    }
  }
  return [...groups.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}
