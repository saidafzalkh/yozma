import Link from "next/link";

export default function Description() {
  return (
    <>
      <h1>Yozma - Personal Web Blog</h1>
      <p>
        <strong>Yozma</strong> is my personal web blog, a space where I share my
        thoughts, ideas, and discoveries. The name <strong>Yozma</strong>, an Uzbek word,
        reflects my passion for writing and expression. According to the Uzbek Explanatory Dictionary {' '}
        <a
          href="https://izoh.uz/word/yozma"
          target="_blank"
          rel="noopener noreferrer"
        >
        izoh.uz
        </a>, <strong>yozma</strong> means:
      </p>
      <blockquote className="italic border-l-4 pl-4 my-2 text-sm text-gray-600">
        «Yozuv bilan ifodalangan, yozilgan. Og‘zaki va yozma nutq. Yozma manbalar.
        Yozma til — adabiy til.»
      </blockquote>
      <p>
        Here, you&apos;ll find posts about philosophy, books, technology, and personal
        insights — everything that fuels my curiosity and learning journey.
        <br />
        <Link href={"/about"}>Read more.</Link>
      </p>
    </>
  );
}
