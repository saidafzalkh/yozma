# Yozma, часть 1: сайт и модуль узбекского текста. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** обновить yozma.uz до дизайна A2 (теги, «tahrirlangan», пометка ИИ, черновики, mermaid, интерфейс на узбекском в новом алфавите) и сделать переиспользуемый модуль: конвертер алфавита, клиент Tahrirchi, линтер поста.

**Architecture:** Модуль `src/lib/uz/` — чистый TypeScript без Node API и без Next.js, чтобы его можно было импортировать в Cloudflare Worker (часть 2). Сеть доступна только через инжектируемый `fetch`. Node-специфичное (чтение файлов, git) лежит в `src/lib/posts/` и `scripts/`. Markdown рендерится через unified (remark → rehype) с `rehype-mermaid`, который выдаёт inline SVG во время сборки.

**Tech Stack:** Next.js 15 (static export), React 19, Tailwind 4 + typography, gray-matter, unified/remark-parse/remark-gfm/remark-rehype/rehype-stringify, rehype-mermaid 3 + playwright (chromium), vitest, tsx, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-12-yozma-reboot-design.md` (разделы 5.x, 9).

## Global Constraints

- TypeScript strict, без `any` без причины. Пакетный менеджер pnpm.
- Новая логика пишется через TDD: сначала падающий тест.
- `src/lib/uz/**` не импортирует `fs`, `path`, `child_process`, `next/*`. Сеть только через параметр `fetch`.
- Буквы нового алфавита: ö U+00F6, ğ U+011F, ş U+015F, ç U+00E7, заглавные Ö U+00D6, Ğ U+011E, Ş U+015E, Ç U+00C7. Тутук: `ʼ` U+02BC.
- Месяцы: yanvar, fevral, mart, aprel, may, iyun, iyul, avgust, sentabr, oktabr, noyabr, dekabr. Формат даты `10-noyabr, 2026`.
- Цвет ИИ: `#7c3aed`, используется только для пометки ИИ.
- Подписи: `Claude bilan suhbatdan`, `ChatGPT bilan suhbatdan`, `tahrirlangan`, `Bosh sahifa`.
- Интерфейс на узбекском в новом алфавите, `<html lang="uz">`.
- Главная — вариант A2: h1, вступление, список «дата + заголовок» и фиолетовая `✦` у постов с `source`. На главной нет тегов, нет «tahrirlangan», нет градиентов.
- Tahrirchi: `POST https://websocket.tahrirchi.uz/proofread`, заголовок `Authorization: <KEY>` (без Bearer), тело `{nodes:[{offset, fields:[{value, markup:false}]}], ws:1}`, не больше 5000 символов на запрос. Ключ берётся только из `TAHRIRCHI_API_KEY`.
- Трейлер механических коммитов: `Yozma-Edit: none`.
- Хостинг и домен не меняются (GitHub Pages, CNAME yozma.uz).

## Review Focus

1. **Тег с буквами ş/ö/ğ/ç или пробелом** (`dasturlaş`, `sun'iy intellekt`). Страница тега должна открываться после static export на GitHub Pages. Слаг тега — ASCII (`dasturlas`, `suniy-intellekt`). Тест в Task 3.
2. **Английские слова и бренды в узбекском тексте.** `ChatGPT`, `GitHub` и всё из `protected-words.txt` не меняются. `fetch` → `fetç` попадает в «подозрительные». Тесты в Task 1 и Task 7.
3. **Апостроф как кавычка или в английском слове.** В `'salom'` начальный `'` не становится тутуком. `o'zbek` → `özbek`, `ma'no` → `maʼno`. Тест в Task 1.
4. **Пост вне git-истории.** Это новый незакоммиченный файл или shallow clone. Сборка не падает, отметки «tahrirlangan» нет. Тест в Task 3.
5. **Ошибка в mermaid-блоке или битый frontmatter.** Сборка падает с сообщением, в котором есть слаг поста, а не с безымянной ошибкой. Тесты в Task 3 и Task 5.

---

### Task 1: Конвертер алфавита + тестовая инфраструктура

**Files:**
- Modify: `package.json` (devDependencies `vitest`, `tsx`; script `"test": "vitest run"`)
- Create: `vitest.config.ts` (алиас `@` → `./src`)
- Create: `src/lib/uz/alphabet.ts`, `src/lib/uz/segments.ts`
- Create: `writing/protected-words.txt` (по слову в строке, `#` — комментарий; стартовый список: ChatGPT, Claude, GitHub, Chrome, Shopify, Next.js, TypeScript, JavaScript, Codex, OpenAI, Anthropic, Cloudflare, Markdown, Tahrirchi)
- Test: `src/lib/uz/alphabet.test.ts`

**Interfaces:**
- Produces:
  - `toNewAlphabet(text: string, protectedWords: readonly string[]): string` конвертирует только прозу.
  - `toOldAlphabet(text: string): { text: string; toNewIndex: number[] }`. `toNewIndex[i]` — индекс во входной строке для символа `i` результата. Нужен, чтобы перенести позиции Tahrirchi обратно.
  - `splitSegments(markdown: string): { kind: "prose" | "protected"; text: string; start: number }[]`. Защищено: fenced-блоки (включая mermaid), inline-код, URL (`https?://\S+`), цели ссылок `](...)`, HTML-теги, frontmatter целиком.
  - `parseProtectedWords(fileContent: string): string[]`.

- [ ] **Step 1: Write the failing tests** (`alphabet.test.ts`)

```ts
const P = ["ChatGPT", "GitHub"];
it("digraphs", () => {
  expect(toNewAlphabet("oʻzbek gʻoya shahar choy", P)).toBe("özbek ğoya şahar çoy");
});
it("apostrophe variants after o/g", () => {
  for (const a of ["ʻ", "'", "‘", "`", "’"]) expect(toNewAlphabet(`o${a}g${a}il`, P)).toBe("öğil");
});
it("case", () => {
  expect(toNewAlphabet("Shahar SHAHAR Choy Oʻzbek Gʻalaba", P)).toBe("Şahar ŞAHAR Çoy Özbek Ğalaba");
});
it("tutuq normalised, not after o/g", () => {
  expect(toNewAlphabet("ma'no san’at", P)).toBe("maʼno sanʼat");
});
it("explicit ʼ after o/g stays tutuq", () => {
  expect(toNewAlphabet("taʼqib goʼ", P)).toBe("taʼqib goʼ");
});
it("s + tutuq + h is not a digraph", () => {
  expect(toNewAlphabet("Is'hoq", P)).toBe("Isʼhoq");
});
it("sh + tutuq + h", () => {
  expect(toNewAlphabet("mash'hur", P)).toBe("maşʼhur");
});
it("ng unchanged", () => { expect(toNewAlphabet("tong ming", P)).toBe("tong ming"); });
it("quote apostrophe at word start untouched", () => {
  expect(toNewAlphabet("'salom' dedi", P)).toBe("'salom' dedi");
});
it("protected words", () => {
  expect(toNewAlphabet("ChatGPT bilan GitHub'da", P)).toBe("ChatGPT bilan GitHubʼda");
});
it("protected zones", () => {
  const md = "---\ntitle: x\n---\nshahar `fetch()` [shu](https://ex.com/shop)\n```mermaid\nA-->B[shahar]\n```\n";
  expect(toNewAlphabet(md, P)).toBe("---\ntitle: x\n---\nşahar `fetch()` [şu](https://ex.com/shop)\n```mermaid\nA-->B[shahar]\n```\n");
});
it("idempotent", () => { const s = toNewAlphabet("oʻzbek shahar", P); expect(toNewAlphabet(s, P)).toBe(s); });
it("toOldAlphabet round trip + index map", () => {
  const r = toOldAlphabet("şahar öğil");
  expect(r.text).toBe("shahar oʻgʻil");
  expect(r.toNewIndex[r.text.indexOf("hahar")]).toBe(0); // 'h' from ş maps to ş
  expect(r.toNewIndex[r.text.indexOf("il")]).toBe("şahar öğ".length);
});
it("parseProtectedWords", () => {
  expect(parseProtectedWords("# c\nChatGPT\n\n GitHub \n")).toEqual(["ChatGPT", "GitHub"]);
});
```

Frontmatter конвертирует не `toNewAlphabet`, а линтер и миграция (Task 4/7), поле за полем.

- [ ] **Step 2: Run `pnpm add -D vitest tsx && pnpm test`** — Expected: FAIL (модули не найдены).
- [ ] **Step 3: Implement** `segments.ts` and `alphabet.ts`. Порядок правил внутри прозы: (1) защищённые слова — целое слово (`\p{L}`-границы), регистр учитывается; (2) `[oOgG]` + апостроф из `ʻ ' ‘ \` ’` → ö/ğ, но только если перед `o/g` стоит буква или начало слова, а `ʼ` U+02BC не трогается; (3) `sh/ch` в любом регистре → ş/ç, заглавная, если заглавная первая буква; (4) апостроф из того же набора между буквами → `ʼ`.
- [ ] **Step 4: Run `pnpm test`** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(uz): alphabet converter to 2026 Latin alphabet`

### Task 2: Даты и слаги на узбекском

**Files:**
- Create: `src/lib/uz/format.ts`
- Test: `src/lib/uz/format.test.ts`

**Interfaces:**
- Produces: `formatUzDate(date: string /* YYYY-MM-DD */): string`, `tagSlug(tag: string): string`.

- [ ] **Step 1: Failing tests**

```ts
expect(formatUzDate("2026-11-10")).toBe("10-noyabr, 2026");
expect(formatUzDate("2025-07-08")).toBe("8-iyul, 2025");
expect(() => formatUzDate("2025-13-01")).toThrow();
expect(tagSlug("dasturlaş")).toBe("dasturlas");
expect(tagSlug("Sunʼiy intellekt")).toBe("suniy-intellekt");
expect(tagSlug("öğiş çoy")).toBe("ogis-coy");
```
- [ ] **Step 2: `pnpm test`** → FAIL.
- [ ] **Step 3: Implement.** Дата разбирается из строки без `Date`/таймзон. Слаг строится так: ö→o, ğ→g, ş→s, ç→c, удалить `ʼʻ'‘’\``, lowercase, всё не `[a-z0-9]` → `-`, схлопнуть, обрезать `-`.
- [ ] **Step 4: `pnpm test`** → PASS.
- [ ] **Step 5: Commit** `feat(uz): uzbek date format and tag slugs`

### Task 3: Модель поста — схема, черновики, сортировка, теги, «tahrirlangan»

**Files:**
- Create: `src/lib/posts/meta.ts` (чистый, без Node API: его использует и линтер)
- Create: `src/lib/posts/edited.ts` (чистая функция + отдельный git-ридер)
- Create: `src/lib/posts/repository.ts` (Node: fs, gray-matter, git)
- Remove dependency: `moment`
- Test: `src/lib/posts/meta.test.ts`, `src/lib/posts/edited.test.ts`, `src/lib/posts/repository.test.ts` (на временной папке-фикстуре)

**Interfaces:**
- Consumes: `formatUzDate`, `tagSlug` (Task 2).
- Produces:
```ts
type PostSource = "claude" | "chatgpt";
type PostStatus = "draft" | "published";
interface PostMeta { slug: string; title: string; date: string /* YYYY-MM-DD */; description: string;
  author: string; tags: string[]; source?: PostSource; status: PostStatus; updated?: string }
interface Post extends PostMeta { editedDate?: string; body: string }
class PostMetaError extends Error {}         // message начинается с `posts/<slug>.md: `
parsePostMeta(data: Record<string, unknown>, slug: string): PostMeta
interface CommitInfo { date: string; skip: boolean }  // newest first, как git log
computeEditedDate(commits: CommitInfo[], override?: string): string | undefined
readCommits(filePath: string): CommitInfo[]          // [] если git недоступен / файл не в истории
getPublishedPosts(dir?: string): Post[]              // без draft, по date убыв.
getPost(slug: string, dir?: string): Post | null     // null для draft и несуществующих
getAllTags(dir?: string): { tag: string; slug: string; posts: Post[] }[]
```

- [ ] **Step 1: Failing tests**
  - `parsePostMeta`:
    - нет `title` → `PostMetaError` с `posts/x.md: `;
    - `date` как JS `Date` (так его отдаёт gray-matter) и как строка `"2025-07-08"` → `"2025-07-08"`;
    - `date: "foo"` → ошибка;
    - `source: "gemini"` → ошибка;
    - `status` по умолчанию `"published"`;
    - `keywords: [a]` без `tags` → `tags: ["a"]`;
    - `author` по умолчанию `"Saidafzal Kholkhujaev"`;
    - `tags` нормализуются в lowercase.
  - `computeEditedDate`:
    - один коммит → `undefined`;
    - `[{2026-11-11}, {2025-07-08}]` → `"2026-11-11"`;
    - тот же день, что и первый коммит → `undefined`;
    - самый свежий `skip: true`, предыдущий `2026-01-02` → `"2026-01-02"`;
    - все правки `skip` → `undefined`;
    - `override` выигрывает всегда;
    - `[]` → `undefined`.
  - `repository` (фикстура из 3 файлов: published, draft, published старше; `readCommits` для файлов вне git → `[]`):
    - `getPublishedPosts` возвращает 2 поста по убыванию `date`;
    - `getPost("draft-slug")` → `null`;
    - битый frontmatter → бросает с именем файла;
    - `getAllTags` группирует по `tagSlug`.
- [ ] **Step 2: `pnpm test`** → FAIL.
- [ ] **Step 3: Implement.** `readCommits` вызывает `git log --follow --format=%cs%x09%(trailers:key=Yozma-Edit,valueonly,separator=%x2C) -- <file>` через `execFileSync`. `skip` = значение `none`. При любой ошибке git возвращается `[]`.
- [ ] **Step 4: `pnpm test`** → PASS.
- [ ] **Step 5: Commit** `feat(posts): post schema, drafts, tags and edited date`

### Task 4: Миграция существующих постов + .gitignore

**Files:**
- Modify: `posts/welcome-to-yozma.md` (`keywords` → `tags`; тело, `title` и `description` переводятся в новый алфавит через `toNewAlphabet` с `protected-words.txt`)
- Modify: `posts/working-with-legacy-code-without-losing-your-mind.md` (`keywords` → `tags`, `status: draft`)
- Modify: `.gitignore` (добавить `.superpowers/`)
- Create: `scripts/convert-post.ts` (`pnpm yozma:convert <file>`: конвертирует тело и строковые поля frontmatter `title`, `description`, `tags`, перезаписывает файл)

**Interfaces:**
- Consumes: `toNewAlphabet`, `parseProtectedWords` (Task 1), `parsePostMeta` (Task 3).

- [ ] **Step 1:** Implement `scripts/convert-post.ts` (тонкая обёртка, логика уже покрыта тестами Task 1). Добавить script `"yozma:convert": "tsx scripts/convert-post.ts"`.
- [ ] **Step 2:** Run `pnpm yozma:convert posts/welcome-to-yozma.md`, then `git diff posts/`. Expected: в diff нет `oʻ/gʻ/sh/ch` в прозе; `ChatGPT`/`GitHub` не изменены; ссылки целы.
- [ ] **Step 3:** Вручную поправить frontmatter обоих постов (`tags`, `status: draft`).
- [ ] **Step 4: Commit** с трейлером, чтобы это не считалось правкой:

```bash
git commit -m "chore(posts): migrate to new alphabet and tags

Yozma-Edit: none"
```

### Task 5: Рендер markdown с mermaid

**Files:**
- Create: `src/lib/posts/render.ts`
- Modify: `package.json` (+ `unified remark-parse remark-gfm remark-rehype rehype-stringify rehype-mermaid playwright`, − `remark remark-html`; script `"postinstall"` не добавлять)
- Test: `src/lib/posts/render.test.ts`

**Interfaces:**
- Produces: `renderMarkdown(markdown: string, slug: string): Promise<string>` → HTML. Ошибка mermaid → `Error`, текст начинается с `posts/<slug>.md: mermaid:`.

- [ ] **Step 1: Failing tests:**
  - заголовок и абзац → `<h2>`/`<p>`;
  - таблица GFM → `<table>`;
  - блок ```` ```mermaid\ngraph TD; A-->B ```` → результат содержит `<svg` и не содержит `class="language-mermaid"`;
  - блок `graph TD; A-->` (синтаксическая ошибка) → reject с `posts/x.md: mermaid:`;
  - обычный ```` ```ts ```` остаётся `<pre><code`;
  - `"# T\n\ntext"` → нет `<h1>` (h1 рендерит страница, ведущий `# ` из тела удаляется).
- [ ] **Step 2:** `pnpm exec playwright install chromium && pnpm test` → FAIL.
- [ ] **Step 3: Implement.** unified: `remarkParse → remarkGfm → remarkRehype → rehypeMermaid({ strategy: "inline-svg", mermaidConfig }) → rehypeStringify`. Конфиг mermaid:
  - `theme: "base"`;
  - `themeVariables`: `primaryColor: "#f3f4f6"`, `primaryBorderColor: "#111827"`, `primaryTextColor: "#111827"`, `lineColor: "#4b5563"`, `fontFamily: "Inter, sans-serif"`.
  Конфиг экспортируется константой `MERMAID_CONFIG`. ИИ-шаги в постах помечаются `classDef ai stroke:#7c3aed,color:#7c3aed`, это уходит в стиль-гайд в части 2.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5: Commit** `feat(posts): unified markdown pipeline with build-time mermaid`

### Task 6: Интерфейс — A2, страница поста, теги, узбекский

**Files:**
- Modify: `src/app/layout.tsx` (`lang="uz"`, футер `© <год> Yozma | MIT litsenziyasi`)
- Modify: `src/styles/global.css` (`@theme { --color-ai: #7c3aed; }`)
- Modify: `src/components/posts.tsx` (заголовок `Postlar`, `<span>дата</span><span>заголовок</span>` как сейчас, плюс `<span className="text-ai" title="Claude bilan suhbatdan">✦</span>` при `source`; без тегов; убрать `console.log`)
- Modify: `src/components/description.tsx` (h1 `Yozma`; существующий текст переводится на узбекский в новом алфавите, смысл не меняется — переписывание в части 4; цитата izoh.uz прогоняется через конвертер)
- Create: `src/components/post-meta-line.tsx` (дата · ✦ подпись источника · `tahrirlangan <дата>`, разделитель ` · `, серый `text-gray-600 text-sm`, ✦-часть `text-ai`)
- Modify: `src/app/[slug]/page.tsx` (ссылка `Bosh sahifa`, h1 из `title`, мета-строка, тело, внизу теги — ссылки на `/teg/<slug>`)
- Create: `src/app/teg/[tag]/page.tsx` (h1 `#<тег>`, список в стиле главной, `generateStaticParams` из `getAllTags`, `dynamicParams = false`)
- Modify: `src/app/about/page.tsx`, `src/app/not-found.tsx` (перевод: `Sahifa topilmadi`, `Bosh sahifaga qaytish`)

**Interfaces:**
- Consumes: `getPublishedPosts`, `getPost`, `getAllTags`, `Post` (Task 3); `renderMarkdown` (Task 5); `formatUzDate` (Task 2).
- `sourceLabel(source: PostSource): string` экспортируется из `post-meta-line.tsx` и возвращает строки из Global Constraints.

- Delete: `src/lib/getPosts.ts` (все вызовы переходят на `src/lib/posts/*`).

- [ ] **Step 1:** Implement components and pages.
- [ ] **Step 2:** `pnpm build` — Expected: успех; в `out/` есть `index.html`, `welcome-to-yozma.html`, нет `working-with-legacy-code-without-losing-your-mind.html`, есть `teg/<slug>.html` для каждого тега.
- [ ] **Step 3:** Check in a real browser (Playwright, `pnpm dlx serve out`):
  - главная выглядит как A2: дата, заголовок, ✦ только у постов с `source`;
  - страница поста показывает мета-строку и теги внизу;
  - ссылка тега открывается;
  - на `/working-with-legacy-code-...` отдаётся 404 на узбекском.
  Временно добавить `source: claude` в welcome-пост, чтобы увидеть ✦, и не коммитить это. Сохранить скриншоты главной и поста.
- [ ] **Step 4: Commit** `feat(site): A2 home, post meta line, tag pages, uzbek UI`

### Task 7: Tahrirchi и линтер поста

**Files:**
- Create: `src/lib/uz/tahrirchi.ts`, `src/lib/uz/lint.ts`
- Create: `writing/blacklist.md` (строки `- <фраза>`; стартовый список из спеки 6: `xulosa qilib aytganda`, `nafaqat`, …; фразы хранятся в новом алфавите)
- Create: `scripts/yozma-check.ts` (`pnpm yozma:check <files...>`: печатает ошибки и предупреждения; exit 1 при ошибках; без `TAHRIRCHI_API_KEY` печатает `tahrirchi: ötkazib yuborildi (kalit yöq)` и проверку орфографии пропускает)
- Test: `src/lib/uz/tahrirchi.test.ts`, `src/lib/uz/lint.test.ts` (fetch подменяется)

**Interfaces:**
- Consumes: `splitSegments`, `toOldAlphabet`, `toNewAlphabet` (Task 1); `parsePostMeta` (Task 3).
- Produces:
```ts
interface SpellSuggestion { offset: number; length: number; token: string; corrections: string[] } // offsets в ИСХОДНОМ (новом) тексте
interface TahrirchiOptions { apiKey: string; fetch?: typeof fetch }
proofreadOld(text: string, opts: TahrirchiOptions): Promise<SpellSuggestion[]>   // текст в старой латинице, режет по абзацам ≤5000
checkUzbek(markdown: string, opts: TahrirchiOptions): Promise<SpellSuggestion[]> // только проза; новый→старый→Tahrirchi→обратно
type IssueCode = "frontmatter" | "old-og" | "old-sh-ch" | "blacklist" | "spelling" | "suspicious";
interface Issue { code: IssueCode; message: string; line?: number }
interface LintOptions { protectedWords: string[]; blacklist: string[]; tahrirchi?: TahrirchiOptions }
lintPost(source: string, slug: string, opts: LintOptions): Promise<{ errors: Issue[]; warnings: Issue[] }>
parseBlacklist(md: string): string[]
```

- [ ] **Step 1: Failing tests**
  - `proofreadOld`:
    - отправляет `Authorization: KEY` без `Bearer` и `ws: 1`;
    - текст 12 000 символов уходит ≥3 запросами, каждый ≤5000, разрезан по `\n\n`;
    - смещения второго куска сдвинуты на длину первого;
    - HTTP 4xx → `Error` с текстом `message` из ответа.
  - `checkUzbek`: при ответе `{token:"shahr", offset:...}` для старого текста `shahr` позиция переводится в новый текст на `şahr`.
  - `lintPost`:
    - нет `title` → error `frontmatter`;
    - `oʻzbek` в прозе → error `old-og`;
    - `oʻ` внутри inline-кода → нет ошибки;
    - `shahar` в прозе → warning `old-sh-ch`;
    - `xulosa qilib aytganda` → warning `blacklist`;
    - Tahrirchi отметил `fetch` (старая форма содержит `ch`, в новом тексте `fetç`) → warning `suspicious` с подсказкой «kod sifatida yozing yoki protected-words.txt ga qöşing»;
    - без `tahrirchi` в опциях нет ни `spelling`, ни `suspicious`, и не падает.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Implement. Номер строки (`line`) вычисляется по смещению в исходном файле.
- [ ] **Step 4:** `pnpm test` → PASS. `pnpm yozma:check posts/welcome-to-yozma.md` → 0 ошибок.
- [ ] **Step 5: Commit** `feat(uz): tahrirchi client and post linter`

### Task 8: CI — деплой и проверки PR

**Files:**
- Modify: `.github/workflows/deploy.yml`:
  - `actions/checkout@v4` с `fetch-depth: 0`;
  - `node-version: 22`;
  - после `pnpm install` шаг `pnpm exec playwright install --with-deps chromium`;
  - `pnpm test` перед `pnpm build`.
- Create: `.github/workflows/check.yml`:
  - `on: pull_request` с `paths: [posts/**, src/**, writing/**, package.json]`;
  - те же шаги установки;
  - `pnpm test`;
  - `pnpm build`;
  - `pnpm yozma:check` по изменённым `posts/*.md`: список берётся через `git diff --name-only --diff-filter=AM origin/${{ github.base_ref }}...HEAD -- 'posts/*.md'`, пустой список — успех;
  - `env: TAHRIRCHI_API_KEY: ${{ secrets.TAHRIRCHI_API_KEY }}`.

- [ ] **Step 1:** Edit workflows.
- [ ] **Step 2:** Локально прогнать `pnpm test && pnpm build && pnpm yozma:check posts/*.md`. Expected: всё зелёное (у черновика могут быть предупреждения).
- [ ] **Step 3:** Commit `ci: full git history, node 22, playwright, PR checks`.
- [ ] **Step 4:** После push/PR проверить, что оба workflow прошли (`gh run list --limit 3`), и показать реальный вывод. Это проверка, а не предположение.
