// In-memory GitHub for tests.
import { GitHubError, type GitHub } from "../github";

export function createFakeGitHub(initialMain: Record<string, string> = {}) {
  const branches = new Map<string, Map<string, string>>([["main", new Map(Object.entries(initialMain))]]);
  const prs: Array<{ number: number; head: string; base: string; title: string; body: string; labels: string[] }> = [];
  const commits: Array<{ path: string; branch: string; message: string; content: string; sha?: string }> = [];
  const shaOf = (c: string) => `sha-${c.length}-${c.slice(0, 8)}`;

  const gh: GitHub = {
    async getFile(path, ref = "main") {
      const c = branches.get(ref)?.get(path);
      return c === undefined ? null : { content: c, sha: shaOf(c) };
    },
    async putFile(p) {
      const files = branches.get(p.branch);
      if (!files) throw new GitHubError(404, "branch yöq");
      const cur = files.get(p.path);
      if (cur !== undefined && p.sha !== shaOf(cur)) throw new GitHubError(409, "sha mos kelmadi");
      if (cur === undefined && p.sha) throw new GitHubError(422, "sha keraksiz");
      files.set(p.path, p.content);
      commits.push({ path: p.path, branch: p.branch, message: p.message, content: p.content, sha: p.sha });
      return { commitUrl: `https://github.com/x/commit/${commits.length}` };
    },
    async getBranchSha(b) {
      return branches.has(b) ? `branch-${b}` : null;
    },
    async createBranch(name, from) {
      const src = branches.get(from.replace("branch-", ""));
      if (!src || branches.has(name)) throw new GitHubError(422, "branch");
      branches.set(name, new Map(src));
    },
    async findOpenPr(head) {
      const pr = prs.find((p) => p.head === head);
      return pr ? { number: pr.number, url: `https://github.com/x/pull/${pr.number}` } : null;
    },
    async createPr(p) {
      const number = prs.length + 1;
      prs.push({ number, ...p });
      return { number, url: `https://github.com/x/pull/${number}` };
    },
  };
  return { gh, branches, prs, commits };
}
