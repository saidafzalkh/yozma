import { getMarkdownSlugs, getPostContent } from "@/lib/getPosts";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getMarkdownSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostContent(slug);
  if (!post) return {};

  return {
    title: post.metadata.title,
    description: post.metadata.description,
    keywords: post.metadata.keywords.join(", "),
    authors: [{ name: post.metadata.author }],
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostContent(slug);
  if (!post) return notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href={"/"}>Home</Link>
      </div>
      <article dangerouslySetInnerHTML={{ __html: post.html }} />
    </div>
  );
}
