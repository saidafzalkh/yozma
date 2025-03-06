import { getAllPosts } from "@/lib/getPosts";
import Link from "next/link";

export default function Posts() {
  const posts = getAllPosts();
  console.log(posts);
  // return <></>;
  return (
    <>
      <h3>Blog Posts</h3>
      <ul className="space-y-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/${post.slug}`}
              className="space-x-2 no-underline cursor-pointer"
              title={post.description}
            >
              <span className="text-sm text-gray-600">{post.date}</span>
              <span>{post.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
