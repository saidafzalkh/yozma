import Link from "next/link";

export default function Description() {
  return (
    <>
      <h1>Yozma</h1>
      <p>
        <strong>Yozma</strong> — mening şaxsiy veb-blogim, men öz fikrlarim,
        ğoyalarim va kaşfiyotlarim bilan örtoqlaşadigan maydon. Özbekça{" "}
        <strong>Yozma</strong> nomi yozişga va özimni ifodalaşga bölgan
        iştiyoqimni aks ettiradi. Özbek tilining izohli luğati{" "}
        <a
          href="https://izoh.uz/word/yozma"
          target="_blank"
          rel="noopener noreferrer"
        >
          izoh.uz
        </a>{" "}
        saytiga köra, <strong>yozma</strong> quyidagini anglatadi:
      </p>
      <blockquote className="italic border-l-4 pl-4 my-2 text-sm text-gray-600">
        «Yozuv bilan ifodalangan, yozilgan. Oğzaki va yozma nutq. Yozma
        manbalar. Yozma til — adabiy til.»
      </blockquote>
      <p>
        Bu yerda falsafa, kitoblar, texnologiya va şaxsiy mulohazalar haqidagi
        postlarni topasiz — qiziqişim va örganiş yölimni oziqlantiradigan
        hamma narsa.
        <br />
        <Link href={"/about"}>Batafsil öqiş.</Link>
      </p>
    </>
  );
}
