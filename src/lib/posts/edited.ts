export interface CommitInfo {
  date: string; // YYYY-MM-DD
  skip: boolean; // Yozma-Edit: none
}

/**
 * Date of the latest real edit. `commits` are newest first (git log order);
 * the last one is the creation commit. Pure: no Node APIs.
 */
export function computeEditedDate(commits: CommitInfo[], override?: string): string | undefined {
  if (override) return override;
  if (commits.length < 2) return undefined;
  const created = commits[commits.length - 1].date;
  const edit = commits.slice(0, -1).find((c) => !c.skip);
  if (!edit || edit.date === created) return undefined;
  return edit.date;
}
