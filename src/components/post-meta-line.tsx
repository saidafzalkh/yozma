import { formatUzDate } from "@/lib/uz/format";
import type { Post, PostSource } from "@/lib/posts/meta";

const SOURCE_LABELS: Record<PostSource, string> = {
  claude: "Claude bilan suhbatdan",
  chatgpt: "ChatGPT bilan suhbatdan",
};

export function sourceLabel(source: PostSource): string {
  return SOURCE_LABELS[source];
}

export default function PostMetaLine({
  post,
}: {
  post: Pick<Post, "date" | "source" | "editedDate">;
}) {
  return (
    <p className="text-gray-600 text-sm">
      <time dateTime={post.date}>{formatUzDate(post.date)}</time>
      {post.source && (
        <>
          {" · "}
          <span className="text-ai">
            <span aria-hidden="true">✦</span> {sourceLabel(post.source)}
          </span>
        </>
      )}
      {post.editedDate && (
        <>
          {" · "}
          <span>
            tahrirlangan{" "}
            <time dateTime={post.editedDate}>
              {formatUzDate(post.editedDate)}
            </time>
          </span>
        </>
      )}
    </p>
  );
}
