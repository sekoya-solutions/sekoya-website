/**
 * Files of public/ that the content refers to, such as the CV (ADR 0007):
 * a page links to one only once it exists, and the placeholder guard
 * (scripts/check-todos.ts) reports it while it is missing. The path is
 * relative to the project's root, where every command runs from, as for the
 * collections' bases in src/content.config.ts.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Whether `/file.pdf`, a path the site serves, is a file of public/. */
export function publicFileExists(path: string, root = process.cwd()): boolean {
  if (!path.startsWith("/")) throw new Error(`${path} must start with /`);
  return existsSync(join(root, "public", path));
}
