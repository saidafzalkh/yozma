import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Yozma - Personal Web Blog</h1>
      <p>
        <strong>Yozma</strong> is my personal web blog, a space where I share my
        thoughts, ideas, and discoveries. The name "Yozma," an Uzbek word,
        reflects my passion for writing and expression. Here, you'll find posts
        about philosophy, books, technology, and personal insights—everything
        that fuels my curiosity and learning journey.
        <br />
        <Link href={"/about"}>Read more.</Link>
      </p>

      <div>{/* Markdown posts here */}</div>
    </main>
  );
}
