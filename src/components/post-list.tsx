import Link from "next/link";
import { formatUzDate } from "@/lib/uz/format";
import { sourceLabel } from "./post-meta-line";
import type { Post } from "@/lib/posts/meta";

export default function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="not-prose space-y-6 mb-10">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={`/${post.slug}`}
            className="space-x-2 no-underline cursor-pointer font-medium"
            title={post.description}
          >
            <span className="text-sm text-gray-600">
              {formatUzDate(post.date)}
            </span>
            <span>{post.title}</span>
            {post.source && (
              <>
                <span className="text-ai" aria-hidden="true">
                  ✦
                </span>
                <span className="sr-only"> ({sourceLabel(post.source)})</span>
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
