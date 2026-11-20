// Classifies a change for CI (ADR 0006): when every changed file is Markdown,
// only the Markdown checks run and the heavy jobs are skipped.
//
// Usage: node scripts/changes.ts <base commit> <head commit>
// Writes `docs_only=true` or `docs_only=false` to $GITHUB_OUTPUT when set,
// and prints it. Any error exits non-zero, which leaves the output empty, so
// the heavy jobs run.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

/** A commit id of zeros, which GitHub sends as `before` when a branch is created. */
const NO_COMMIT = /^0+$/;

/** True when the list is not empty and every path is a Markdown file. */
export function isDocumentationOnly(paths: readonly string[]): boolean {
  return paths.length > 0 && paths.every((path) => path.endsWith(".md"));
}

/**
 * The paths that differ between two commits, with renames listed as a
 * deletion and an addition, so that renaming `a.ts` to `a.md` counts `a.ts`.
 */
export function changedFiles(base: string, head: string, cwd = process.cwd()): string[] {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", base, head, "--"],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return output.split("\0").filter((path) => path !== "");
}

/** Decides for two commits; a missing base means every job runs. */
export function decide(base: string | undefined, head: string, cwd = process.cwd()): boolean {
  if (base === undefined || base === "" || NO_COMMIT.test(base)) {
    return false;
  }
  return isDocumentationOnly(changedFiles(base, head, cwd));
}

if (import.meta.main) {
  const [base, head] = process.argv.slice(2);
  if (head === undefined || head === "") {
    throw new Error("Usage: node scripts/changes.ts <base commit> <head commit>");
  }
  const line = `docs_only=${decide(base, head)}`;
  console.log(line);
  const output = process.env.GITHUB_OUTPUT;
  if (output !== undefined && output !== "") {
    appendFileSync(output, `${line}\n`);
  }
}
