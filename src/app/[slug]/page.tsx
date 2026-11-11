import PostMetaLine from "@/components/post-meta-line";
import { getPost, getPublishedPosts } from "@/lib/posts/repository";
import { renderMarkdown } from "@/lib/posts/render";
import { tagSlug } from "@/lib/uz/format";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export async function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags.join(", "),
    authors: [{ name: post.author }],
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return notFound();

  const html = await renderMarkdown(post.body, post.slug);

  return (
    <div>
      <div className="mb-4">
        <Link href={"/"}>Boş sahifa</Link>
      </div>
      <h1 className="mb-2">{post.title}</h1>
      <PostMetaLine post={post} />
      {post.seed && (
        <figure className="not-prose my-6 border-l-2 border-gray-300 pl-4">
          <figcaption className="text-xs text-gray-500">
            Suhbat şundan boşlandi
          </figcaption>
          <blockquote className="mt-1 italic text-gray-700">
            {post.seed}
          </blockquote>
        </figure>
      )}
      <article dangerouslySetInnerHTML={{ __html: html }} />
      {post.tags.length > 0 && (
        <ul className="not-prose flex flex-wrap gap-x-3 text-sm text-gray-600 mt-8 mb-10">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link href={`/teg/${tagSlug(tag)}`}>#{tag}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
