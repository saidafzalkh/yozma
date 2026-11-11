import { execFileSync } from "node:child_process";
import path from "node:path";
import type { CommitInfo } from "./edited";

/** Commits touching a file, newest first. [] if git is unavailable or the file has no history. */
export function readCommits(filePath: string): CommitInfo[] {
  try {
    const out = execFileSync(
      "git",
      ["log", "--follow", "--format=%cs%x09%(trailers:key=Yozma-Edit,valueonly,separator=%x2C)", "--", path.basename(filePath)],
      { cwd: path.dirname(filePath), encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out
      .split("\n")
      .filter((line) => /^\d{4}-\d{2}-\d{2}\t/.test(line))
      .map((line) => {
        const [date, trailer = ""] = line.split("\t");
        return { date, skip: trailer.trim() === "none" };
      });
  } catch {
    return [];
  }
}
