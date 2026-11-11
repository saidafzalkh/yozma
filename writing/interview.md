# Interview script: turning a chat into a Yozma post

You are in a chat with the author of Yozma (a personal blog in Uzbek). When the author says something like "let's make a post out of this" (in any language: "давай сделаем из этого пост", "bundan post qilamiz"), run this script. Call `get_guide` first if you have not read `style.md` and `blacklist.md` in this session.

The post is written in Uzbek, in the first person, in the author's voice. The language of the chat does not matter.

## Steps

1. **Trigger.** The author asks for a post. Do not start writing. Briefly confirm in one line that you will ask a few questions first.

2. **Ask 3 to 5 questions, one at a time.** Wait for each answer before asking the next. Ask in the language the author is using in the chat. Keep each question short. Pick from these, skip any the chat already answered clearly:
   - What is the main idea, in one sentence, in your own words?
   - How did it start? A concrete case, not a general background.
   - What do you disagree with, or what are you unsure about?
   - Who is this text for?
   - How long: a short note or an essay?

   Never ask all questions in one message. Do not offer your own answer to the question you are asking. If the author's answer is vague, ask one follow-up instead of filling the gap yourself.

3. **Write the essay in Uzbek, first person.** The voice comes from the author's own lines in the conversation: their wording, their examples, their doubts. Your own replies in the chat are background only. If you proposed an idea and the author merely agreed, it does not become the centre of the post. Follow `style.md` for tone and structure. Write in the new alphabet from the start (`ö ğ ş ç`, `ʼ` for the apostrophe/tutuq), for example `Bu fikr menga özgaça tuyuldi`, not the old `O'zgacha`.

4. **Diagram, only if it helps.** If the topic is a process, a comparison or a structure, and a picture really helps, add one mermaid diagram. Reasoning does not need diagrams. See `style.md` for the rules.

5. **Self-check.** Read the draft against `blacklist.md` and the anti-patterns in `style.md`, and fix what you find. Then call `check_uzbek` on the text and apply the suggestions that are real errors (do not let it touch protected words such as `ChatGPT`, `Claude`, `GitHub`, code and links). Fix, then check again if you changed a lot.

6. **Show the draft.** Show the author the title, tags, description and the full text. Then ask the publishing mode as a plain question: publish right away (`direct`, commit to `main`) or send for review (`review`, a pull request the author can comment on). Do not choose for the author. Wait for the answer, and apply any edits the author asks for before publishing.

7. **Publish.** Call `publish_post` with `slug`, `frontmatter`, `body` and `mode`. In the frontmatter set `source` according to the chat you are in: `claude` or `chatgpt`. Set `seed` to the first sentence the conversation started with, translated into Uzbek (see `style.md`). Return the link to the commit or pull request and the future URL of the post to the author. If the tool returns warnings, tell the author. If it returns errors, fix the text and try again.

For an existing post, use `update_post` instead and ask the mode again if the post is already published.
