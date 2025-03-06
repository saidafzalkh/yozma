import Link from "next/link";

export default function About() {
  return (
    <section>
      <div className="mb-4">
        <Link href="/">Home</Link>
      </div>

      <h1>About</h1>

      <p>
        <strong>Yozma</strong> is an open-source web blog designed for
        simplicity, performance, and ease of use. Built with{" "}
        <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer">
          Next.js
        </a>{" "}
        in Static Export mode, it leverages{" "}
        <a
          href="https://pages.github.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Pages
        </a>{" "}
        for hosting and{" "}
        <a
          href="https://github.com/features/actions"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Actions
        </a>{" "}
        for automated CI/CD and deployment.
      </p>
      <p>
        For styling,{" "}
        <a
          href="https://tailwindcss.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          tailwindcss
        </a>{" "}
        and{" "}
        <a
          href="https://tailwindcss.com/docs/typography-plugin"
          target="_blank"
          rel="noopener noreferrer"
        >
          @tailwindcss/typography
        </a>{" "}
        ensure a clean and readable layout. Content is written in Markdown,
        using{" "}
        <a
          href="https://obsidian.md/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Obsidian
        </a>{" "}
        as the primary writing tool, making it easy to structure and manage
        posts.
      </p>
      <p>
        The project is open to contributions, and the source code is available
        on GitHub. If you&apos;re interested in how it works or want to
        contribute, check out the repository and join the development!
      </p>

      <a
        href="https://github.com/saidafzalkh/yozma"
        target="_blank"
        rel="noopener noreferrer"
      >
        Source
      </a>
    </section>
  );
}
