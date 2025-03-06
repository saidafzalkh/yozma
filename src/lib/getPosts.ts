import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import moment from "moment";

export const POSTS_DIR = path.join(process.cwd(), "posts");

export function getMarkdownFiles() {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((fileName) => fileName.endsWith(".md"));
}

export function getMarkdownSlugs() {
  return getMarkdownFiles().map((file) => ({
    slug: file.replace(/\.md$/, ""),
  }));
}

export async function getPostContent(slug: string) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(fileContent);
  const processedContent = await remark().use(remarkHtml).process(content);

  return {
    html: processedContent.toString(),
    metadata: {
      title: data.title || "Untitled Post",
      date: data.date || "Unknown Date",
      author: data.author || "Unknown Author",
      keywords: data.keywords || [],
      description: data.description || "",
    },
  };
}

export function getAllPosts() {
  return getMarkdownFiles()
    .map((file) => {
      const filePath = path.join(POSTS_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContent);

      return {
        slug: file.replace(/\.md$/, ""),
        title: data.title || "Untitled Post",
        date: moment(data.date).format("LL") || "-",
        description: data.description || "",
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
