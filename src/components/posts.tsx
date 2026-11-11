import { getPublishedPosts } from "@/lib/posts/repository";
import PostList from "./post-list";

export default function Posts() {
  return (
    <>
      <h3>Postlar</h3>
      <PostList posts={getPublishedPosts()} />
    </>
  );
}
