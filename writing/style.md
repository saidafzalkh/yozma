# Yozma style guide

For the model that writes posts for Yozma, and for the PR bot that edits them. Read `blacklist.md` (banned phrases) together with this file. The reference example is `posts/welcome-to-yozma.md`: look at it when in doubt.

The guide is in English for you. All examples of text are Uzbek in the new alphabet (`ö ğ ş ç`, tutuq `ʼ`).

## Voice

- The voice is built from the author's own lines in the conversation. Reuse their wording, their examples, their doubts. Your own replies are only background. An idea that you proposed and the author merely accepted must not become the centre of the post.
- The tone is serious, like a senior developer explaining something to a colleague. No pathos, no grand openings, no motivational ending.
- First person, plain sentences, concrete cases. Short is better than ornate.
- Do not write that the author stopped loving to write or to read. The author still loves both. Do not invent such a story to explain why the blog changed.
- Honest about limits: say what is not known, what is unfinished, what the author is not sure about.

Good, from the reference post: `Halol aytganda, hamma qism hali tayyor emas.` and `Bilmayman. Bu birinçi navbatda özim uçun hobbi.`

## Frontmatter

- `title`, `date` (today in `Asia/Tashkent`, `YYYY-MM-DD`), `author`, `description` (one or two sentences), `tags`, `source` (`claude` or `chatgpt`, taken from the chat you are in).
- `seed`: the very first sentence of the conversation, translated into Uzbek in the new alphabet. If the first message is long, use its opening sentence, or the single sentence that states the idea. It is the seed the post grew from. Keep the author's wording, do not polish it.

## AI footnotes

Notes marked `[^ai-N]` show where the model took part. The site renders them as a purple ✦. Rules:

- Phrase them as joint work: `Bu yondaşuv Claude bilan muhokamada çiqdi.` or `... variantini Claude bilan birga körib çiqdik.`
- Never as the model giving the answer: not `Claude yeçim berdi`, not `Claude taklif qildi va men qabul qildim`.
- At most 1 to 3 per post. Do not annotate every paragraph.
- Number them `[^ai-1]`, `[^ai-2]` in order. Definitions go at the end, after ordinary footnotes.

## Ordinary footnotes

Use ordinary footnotes `[^1]` for terms the reader may not know (`MCP`, `Tahrirchi`). One line each, with the explanation after a colon. Do not explain well-known words.

## Mermaid diagram

- At most one per post. Only for a process or a comparison. A line of reasoning does not need a diagram.
- Mark steps done by the model with a class: `classDef ai stroke:#7c3aed,color:#7c3aed`, then `C[3 ta savol]:::ai`.
- Write labels in the new alphabet right away (`Imlo tekşiruvi`, not `Imlo tekshiruvi`).
- Quote labels that contain punctuation: `B["«bundan post qilamiz»"]`.

## Project posts

If the post is about a project, include an honest section about what is not done yet, with the real state: what works, what does not. See `Hozir nima işlaydi` in the reference post.

## Code and old letters

- When the old-alphabet letters are the subject of the text, put them in inline code: `oʻ`, `gʻ`, `sh`, `ch` versus `ö`, `ğ`, `ş`, `ç`. Otherwise the converter would change them.
- Code blocks, inline code, links and protected words (`ChatGPT`, `GitHub`, `fetch`) are not converted.
- Raw HTML is stripped from posts. Do not use it. Use Markdown only.

## Anti-patterns

Do not write these. The exact banned phrases are in `blacklist.md`; the patterns below are broader.

- Grand openings: `Bugungi kunda texnologiyalar tez rivojlanmoqda...`. Start with the concrete case.
- `Xulosa qilib aytganda` and any recap paragraph that repeats the post.
- `nafaqat ..., balki ...` constructions.
- Triplets of adjectives: `tez, qulay va ishonçli`.
- A moral at the end, or a call to the reader to think or act.
- Several rhetorical questions in a row.
- Frequent dashes. Prefer a period or a comma.
- Emoji.
- Filler claims of importance: `muhim ahamiyatga ega`.

## Before you finish

Check the draft against this list and `blacklist.md`, run `check_uzbek`, and make sure there are no old-alphabet letters left outside inline code.
