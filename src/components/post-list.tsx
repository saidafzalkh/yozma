import Link from "next/link";
import { formatUzDate } from "@/lib/uz/format";
import { sourceLabel } from "./post-meta-line";
import type { Post } from "@/lib/posts/meta";

export default function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="space-y-6 list-none pl-0">
      {posts.map((post) => (
        <li key={post.slug} className="pl-0">
          <Link
            href={`/${post.slug}`}
            className="space-x-2 no-underline cursor-pointer"
            title={post.description}
          >
            <span className="text-sm text-gray-600">
              {formatUzDate(post.date)}
            </span>
            <span>{post.title}</span>
            {post.source && (
              <span className="text-ai" title={sourceLabel(post.source)}>
                ✦
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
