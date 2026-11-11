import Link from "next/link";

export default function About() {
  return (
    <section>
      <div className="mb-4">
        <Link href="/">Boş sahifa</Link>
      </div>

      <h1>Loyiha haqida</h1>

      <p>
        <strong>Yozma</strong> — oddiylik, tezkorlik va qulaylik uçun yaratilgan
        oçiq kodli veb-blog. U{" "}
        <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer">
          Next.js
        </a>{" "}
        asosida Static Export rejimida qurilgan, hosting uçun{" "}
        <a
          href="https://pages.github.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Pages
        </a>
        , avtomatik CI/CD va joylaştiriş uçun esa{" "}
        <a
          href="https://github.com/features/actions"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Actions
        </a>{" "}
        işlatiladi.
      </p>
      <p>
        Dizayn uçun{" "}
        <a
          href="https://tailwindcss.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          tailwindcss
        </a>{" "}
        va{" "}
        <a
          href="https://tailwindcss.com/docs/typography-plugin"
          target="_blank"
          rel="noopener noreferrer"
        >
          @tailwindcss/typography
        </a>{" "}
        toza va qulay öqiladigan körinişni taʼminlaydi. Kontent Markdown
        formatida yoziladi, asosiy yoziş vositasi sifatida{" "}
        <a
          href="https://obsidian.md/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Obsidian
        </a>{" "}
        işlatiladi — bu postlarni tuziş va boşqarişni yengillaştiradi.
      </p>
      <p>
        Loyiha hissa qöşişga oçiq, manba kodi GitHubʼda mavjud. U qanday
        işlaşi qiziqtirsa yoki hissa qöşmoqçi bölsangiz, repozitoriyga
        ötib, işlanmaga qöşiling!
      </p>

      <a
        href="https://github.com/saidafzalkh/yozma"
        target="_blank"
        rel="noopener noreferrer"
      >
        Manba kodi
      </a>
    </section>
  );
}
