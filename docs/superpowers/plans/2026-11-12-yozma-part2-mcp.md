# Yozma, часть 2: MCP-сервер. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** удалённый MCP-сервер `mcp.yozma.uz` на Cloudflare Workers. Через него claude.ai, ChatGPT и Claude Code проводят интервью, пишут пост, проверяют его и публикуют в репозиторий: сразу или через PR.

**Architecture:** Папка `mcp/` в этом репозитории, со своим `package.json`, подключена как pnpm workspace. Логика инструментов лежит в чистых модулях `mcp/src/tools/*.ts`. Они получают зависимости параметрами: клиент GitHub, fetch и «сегодня», и тестируются vitest'ом без Workers. Тонкий слой `mcp/src/index.ts` связывает их с `agents/mcp/server` и `@cloudflare/workers-oauth-provider`. Вход через GitHub OAuth разрешён только логину автора. Узбекская логика переиспользуется из `src/lib/uz/*` и `src/lib/posts/meta.ts` относительными импортами.

**Tech Stack:** Cloudflare Workers, wrangler 4, `agents` (createMcpHandler, getMcpAuthContext), `@cloudflare/workers-oauth-provider` 1.x, `@modelcontextprotocol/server`, zod, Workers KV, GitHub REST API (Contents, Git refs, Pulls, Issues labels), vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-yozma-reboot-design.md`, раздел 6.

## Global Constraints

- TypeScript strict, без `any` без причины. TDD для логики инструментов.
- `mcp/src/tools/**` и `mcp/src/github.ts` чистые: никаких `fs`/`path`/`process`/Node API. Сеть только через инжектируемый `fetch`.
- Репозиторий `saidafzalkh/yozma`, ветка по умолчанию `main`. Посты лежат в `posts/<slug>.md`. Слаг удовлетворяет `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Ветка для аудита: `post/<slug>`. Метка PR: `post`. Коммиты пишутся с автором `Yozma MCP <mcp@yozma.uz>` и трейлером `Co-Authored-By: <model> via Yozma MCP`, где model берётся из клиента, если клиент её сообщил, иначе `AI`.
- Дата поста: сегодняшняя дата в `Asia/Tashkent`, формат `YYYY-MM-DD`.
- Перед любым коммитом текст проходит `convertFrontmatterFields` + `toNewAlphabet` (protected words из `writing/protected-words.txt` на `main`), затем `lintPost`. `errors` блокируют коммит, `warnings` возвращаются вызывающему.
- Секреты: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_TOKEN` (fine-grained PAT, только этот репозиторий, Contents RW + Pull requests RW), `TAHRIRCHI_API_KEY`. Переменные: `ALLOWED_GITHUB_LOGIN = "saidafzalkh"`, `MCP_RESOURCE = "https://mcp.yozma.uz/mcp"`, `REPO = "saidafzalkh/yozma"`. KV: `OAUTH_KV`.
- Все сообщения пользователю на узбекском в новом алфавите (как в линтере). Стиль-гайд пишется для модели, его язык — английский или русский, на выбор исполнителя, но примеры в нём даются на узбекском.

## Review Focus

1. **Посторонний GitHub-логин проходит OAuth.** Сервер должен отказать (403) до `completeAuthorization`. Тест в Task 4.
2. **`publish_post` со слагом, который уже есть в `main`.** Ошибка с советом использовать `update_post`, а не тихая перезапись. Тест в Task 3.
3. **`update_post` для поста с открытым PR.** Коммит идёт в ветку `post/<slug>`, а не в `main`, и `date` обновляется на сегодняшнюю (спека 5.3). Тест в Task 3.
4. **Ошибки линтера.** `publish_post` ничего не коммитит, если есть `errors` (например, Cyrillic-тег или битая дата), и возвращает их списком. Тест в Task 3.
5. **Конкурентное изменение файла.** Если GitHub отвечает 409/422 из-за устаревшего `sha`, пользователь получает понятную ошибку, без повтора с перезаписью. Тест в Task 2.

---

### Task 1: Каркас `mcp/` + стиль-гайд и интервью

**Files:**
- Create: `pnpm-workspace.yaml` (`packages: ["mcp"]`), `mcp/package.json` (scripts: `dev`, `deploy`, `typecheck`; deps: `agents`, `@cloudflare/workers-oauth-provider`, `@modelcontextprotocol/server`, `zod`, `js-yaml`; dev: `wrangler`, `@cloudflare/workers-types`), `mcp/tsconfig.json`, `mcp/wrangler.jsonc` (name `yozma-mcp`, `compatibility_date` = текущая дата, route `mcp.yozma.uz` с `custom_domain: true`, KV `OAUTH_KV` с id-заглушкой, vars из Global Constraints).
- Modify: root `vitest.config.mts` include += `mcp/src/**/*.test.ts`; root `package.json` script `mcp:typecheck`.
- Create: `writing/interview.md` и `writing/style.md`. Содержание берётся из спеки 6 (сценарий в чате, стоп-лист) плюс правила, утверждённые автором:
  - голос строится из реплик автора, ИИ служит фоном;
  - тон серьёзный, «сеньор-разработчик», без пафоса;
  - не писать, что автор разлюбил писать или читать;
  - `seed` — первая фраза разговора в переводе на узбекский;
  - ✦-сноски `[^ai-N]` формулируются как совместная работа («Claude bilan muhokamada çiqdi»), никогда не «Claude yeçim berdi», и их не больше 1–3;
  - обычные сноски для терминов;
  - не больше одной mermaid-схемы, только для процессов и сравнений, ИИ-шаги отмечаются `classDef ai stroke:#7c3aed,color:#7c3aed`, подписи сразу в новом алфавите;
  - честный раздел о том, что ещё не сделано, если речь о проекте;
  - буквы старого алфавита как предмет разговора берутся в inline-код;
  - raw HTML в постах вырезается.

- [ ] **Step 1:** `pnpm install`, `pnpm --filter mcp exec tsc --noEmit` проходит на пустом `src/index.ts`, который экспортирует заглушку `fetch` → 404.
- [ ] **Step 2: Commit** `chore(mcp): workspace skeleton, writing guide and interview`

### Task 2: Клиент GitHub

**Files:** Create `mcp/src/github.ts`, `mcp/src/github.test.ts`.

**Interfaces — Produces:**
```ts
interface GitHubOptions { token: string; repo: string; fetch?: typeof fetch }
class GitHubError extends Error { status: number }
createGitHub(opts): {
  getFile(path: string, ref?: string): Promise<{ content: string; sha: string } | null>; // base64→utf8 (UTF-8-safe, без Buffer)
  putFile(p: { path: string; content: string; message: string; branch: string; sha?: string }): Promise<{ commitUrl: string }>;
  getBranchSha(branch: string): Promise<string | null>;
  createBranch(name: string, fromSha: string): Promise<void>;
  findOpenPr(head: string): Promise<{ number: number; url: string } | null>;
  createPr(p: { head: string; base: string; title: string; body: string; labels: string[] }): Promise<{ number: number; url: string }>;
}
```
- [ ] **Step 1: Failing tests** (fetch замокан):
  - заголовки `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`;
  - `getFile` на 404 → `null`;
  - контент `özbek ʼ ✦` переживает base64 туда и обратно;
  - `putFile` передаёт `sha` только если он задан;
  - 409/422 → `GitHubError` с сообщением на узбекском: «fayl boşqa joyda özgargan, qayta urinib köring»;
  - `createPr` ставит метку отдельным вызовом Issues API, если метки при создании не поддерживаются;
  - `findOpenPr` использует `head=saidafzalkh:post/x&state=open`.
- [ ] **Steps 2–5:** RED → реализация → GREEN → commit `feat(mcp): github client`.

### Task 3: Логика инструментов

**Files:** Create `mcp/src/tools/{guide,check,publish,update}.ts`, тесты рядом, `mcp/src/tools/post-file.ts` (сборка файла: frontmatter через `js-yaml` `dump` c `CORE_SCHEMA`, `date` строкой).

**Interfaces — Produces:**
```ts
interface ToolDeps { gh: ReturnType<typeof createGitHub>; today: () => string; tahrirchi?: { apiKey: string; fetch?: typeof fetch }; model?: string }
getGuide(deps): Promise<string>  // writing/interview.md + style.md + blacklist.md с main
checkUzbek(deps, markdown: string): Promise<{ converted: string; errors: Issue[]; warnings: Issue[] }>
convertAlphabet(deps, text: string): Promise<string>
type PostInput = { slug: string; title: string; description: string; tags: string[]; source: "claude" | "chatgpt"; seed?: string; body: string }
publishPost(deps, input: PostInput, mode: "direct" | "review"): Promise<{ url: string; postUrl: string; warnings: Issue[] }>
updatePost(deps, input: { slug: string } & Partial<Omit<PostInput, "slug">>, mode?: "direct" | "review"): Promise<{ url: string; postUrl: string; warnings: Issue[] }>
```
Поведение:
- `publishPost` проверяет слаг, затем смотрит `posts/<slug>.md` на `main`. Если файл есть → ошибка «bu slug band, update_post ni işlating». Дальше собирает файл с `date = today()`, конвертирует, линтит, при ошибках бросает их.
  - `direct` → `putFile` в `main`.
  - `review` → ветка `post/<slug>` от `main` (если ветка уже есть, ошибка), коммит, PR «Post: <title>» с меткой `post` и телом: описание + предупреждения линтера.
- `updatePost` смотрит, есть ли открытый PR `post/<slug>`.
  - Есть → читает файл из ветки, сливает поля, ставит `date = today()`, коммитит в ветку.
  - Нет → читает с `main`; если файла нет → ошибка. Без `mode` → ошибка «mode kerak: direct yoki review». `direct` → коммит в `main` (дата не меняется, поле `updated` не трогаем: дата правки берётся из git). `review` → ветка + PR, как в `publishPost`.
- `postUrl = https://yozma.uz/<slug>`.

- [ ] **Step 1: Failing tests** с фейковым `gh` в памяти. Покрыть все ветки поведения выше, плюс Review Focus 2–4. Проверить, что тело и frontmatter в коммите идут в новом алфавите, а `ChatGPT` не тронут.
- [ ] **Steps 2–5:** RED → реализация → GREEN → commit `feat(mcp): guide, check, publish and update tools`.

### Task 4: Worker — OAuth через GitHub + MCP-сервер

**Files:** Create `mcp/src/index.ts`, `mcp/src/auth.ts`, `mcp/src/auth.test.ts`, `mcp/src/server.ts`.

- `server.ts`: `createServer(env)` регистрирует инструменты `get_guide`, `check_uzbek`, `convert_alphabet`, `publish_post`, `update_post` (zod-схемы входа, описания на английском — модели читают их лучше, — с явной инструкцией: «Before writing, call get_guide and follow it.»). Вывод — текст/JSON. Ошибки → `isError: true` с узбекским сообщением.
- `auth.ts`: `defaultHandler` по документации `agents/docs/agents/securing-mcp-servers.md`: страница согласия → `approveConsent` → `beginUpstream` → редирект на `https://github.com/login/oauth/authorize` (scope `read:user`) → `/callback` → `finishUpstream` → обмен кода → `GET https://api.github.com/user` → если `login !== ALLOWED_GITHUB_LOGIN` → 403 «Ruxsat yöq» → иначе `completeAuthorization({ userId: login, props: { login } })`. Чистую функцию `isAllowed(login, allowed)` (без учёта регистра) вынести отдельно и протестировать.
- `index.ts`: `new OAuthProvider({ apiRoute: "/mcp", apiHandler: { fetch: mcpHandler }, defaultHandler, authorizeEndpoint: "/authorize", tokenEndpoint: "/oauth/token", clientRegistrationEndpoint: "/oauth/register", resourceMetadata: { resource: env.MCP_RESOURCE } })`. Перед реализацией API сверить с README/доками в `node_modules/agents` и `node_modules/@cloudflare/workers-oauth-provider` — не угадывать.
- [ ] **Step 1:** тесты `isAllowed` и обработчика callback с мок-fetch: чужой логин → 403 и `completeAuthorization` не вызван.
- [ ] **Step 2:** `pnpm --filter mcp exec wrangler deploy --dry-run --outdir /tmp/yozma-mcp-dry` проходит (бандл собирается, относительные импорты из `src/lib/uz` разрешаются, Node API в бандле нет).
- [ ] **Step 3:** локально `pnpm --filter mcp dev` + `npx @modelcontextprotocol/inspector`: `/mcp` без токена → 401 с `WWW-Authenticate`, метаданные `/.well-known/oauth-protected-resource` указывают на `MCP_RESOURCE`. Результат приложить в отчёт.
- [ ] **Step 4: Commit** `feat(mcp): worker with GitHub OAuth and tools`.

### Task 5: Мастер развёртывания и CI

**Files:** Create `mcp/scripts/setup.sh`: интерактивный bash-мастер по skill `mattpocock-skills:wizard`, только для шагов, которые может сделать лишь человек. Modify `.github/workflows/check.yml` (paths += `mcp/**`, `pnpm-workspace.yaml`; шаг `pnpm mcp:typecheck`), `README.md` (раздел «MCP»).

Шаги мастера:
1. `wrangler login`.
2. `wrangler kv namespace create OAUTH_KV` и подстановка id в `wrangler.jsonc`.
3. Создание GitHub OAuth App: ссылка `https://github.com/settings/applications/new`, Homepage `https://mcp.yozma.uz`, Callback `https://mcp.yozma.uz/callback`.
4. Fine-grained PAT: ссылка, права из Global Constraints.
5. `wrangler secret put` для четырёх секретов, ввод скрыт.
6. `wrangler deploy`.
7. Проверка: `curl -s -o /dev/null -w '%{http_code}' https://mcp.yozma.uz/mcp` → `401`.
8. Подключение: claude.ai → Settings → Connectors → Add custom connector → `https://mcp.yozma.uz/mcp`; ChatGPT → Settings → Apps/Connectors → Advanced → Developer mode → Add custom MCP server, тот же URL. Предупредить: на некоторых тарифах ChatGPT пишущие инструменты могут быть недоступны, это проверяется в UI. Claude Code: `claude mcp add --transport http yozma https://mcp.yozma.uz/mcp`.

- [ ] **Step 1:** `bash -n mcp/scripts/setup.sh` проходит; ни один секрет не печатается и не пишется в файл.
- [ ] **Step 2: Commit** `feat(mcp): setup wizard, CI typecheck, docs`.
