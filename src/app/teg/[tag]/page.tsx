import PostList from "@/components/post-list";
import { getAllTags } from "@/lib/posts/repository";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = Promise<{ tag: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTags().map(({ slug }) => ({ tag: slug }));
}

function findTag(slug: string) {
  return getAllTags().find((t) => t.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { tag } = await params;
  const found = findTag(tag);
  return found ? { title: `#${found.tag}` } : {};
}

export default async function TagPage({ params }: { params: Params }) {
  const { tag } = await params;
  const found = findTag(tag);
  if (!found) return notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href={"/"}>Boş sahifa</Link>
      </div>
      <h1>#{found.tag}</h1>
      <PostList posts={found.posts} />
    </div>
  );
}
