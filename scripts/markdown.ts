// The Markdown checks of ADR 0006, run on the Markdown files git tracks, the
// same set locally and in CI.
//
// Usage: node scripts/markdown.ts lint    (markdownlint-cli2)
//        node scripts/markdown.ts links   (lychee, offline: relative links and anchors)
// lychee is looked up as `lychee` on the PATH, or at the path in $LYCHEE.

import { execFileSync, spawnSync } from "node:child_process";
import { main as markdownlint } from "markdownlint-cli2";

function trackedMarkdownFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "*.md"], { encoding: "utf8" })
    .split("\0")
    .filter((path) => path !== "");
}

function links(files: string[]): number {
  const lychee = process.env.LYCHEE || "lychee";
  const result = spawnSync(lychee, ["--offline", "--no-progress", "--", ...files], {
    stdio: "inherit",
  });
  if (result.error !== undefined) {
    console.error(`Could not run lychee (${lychee}): ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

const mode = process.argv[2];
const files = trackedMarkdownFiles();
if (mode === "lint") {
  // The API logs nothing unless given loggers.
  process.exitCode = await markdownlint({
    argv: files,
    logMessage: console.log,
    logError: console.error,
  });
} else if (mode === "links") {
  process.exitCode = links(files);
} else {
  console.error("Usage: node scripts/markdown.ts lint|links");
  process.exitCode = 1;
}
