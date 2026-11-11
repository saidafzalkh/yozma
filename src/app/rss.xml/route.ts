import { getPublishedPosts } from "@/lib/posts/repository";
import { buildRss } from "@/lib/posts/rss";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildRss(getPublishedPosts(), SITE), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
