// The placeholder guard (ADR 0007): lists every `[TODO` left in the content
// and in the built pages, and every file of public/ the content refers to that
// is missing, such as the CV. It exits with an error when it finds any, unless
// ALLOW_TODO=1, where it only reports: previews, and CI until the launch makes
// it a gate on the production build.
//
// Usage: npm run build, then npm run check:todos (from the project's root).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

/** A placeholder found in a file. */
export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/** What the guard found: placeholders, and missing files of public/. */
export interface Report {
  readonly placeholders: Finding[];
  readonly missingFiles: string[];
}

/** Any `[TODO`, with what follows it up to its closing bracket, if any. */
const placeholderPattern = /\[TODO[^\]\n]*\]?/g;

/** The content's files, and the built pages, where a placeholder may remain. */
const contentFolder = "src/content";
const contentExtensions = new Set([".json", ".md", ".mdx"]);
const buildFolder = "dist";

/** The placeholders of a text, with their line numbers, from 1. */
export function findPlaceholders(text: string, file: string): Finding[] {
  return text.split("\n").flatMap((line, index) =>
    [...line.matchAll(placeholderPattern)].map((match) => ({
      file,
      line: index + 1,
      text: match[0],
    })),
  );
}

/** Every file under a folder, recursively, whose extension is listed. */
export function filesUnder(folder: string, extensions: ReadonlySet<string>): string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.has(extname(entry.name)))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

/**
 * The files of public/ a content entry refers to: every string under a key
 * named `file`, such as the CV's `/cv.pdf` (src/content.config.ts).
 */
export function referencedFiles(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(referencedFiles);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, item]) =>
    key === "file" && typeof item === "string" ? [item] : referencedFiles(item),
  );
}

/** Checks the content and the build of a project. */
export function check(root: string): Report {
  const build = join(root, buildFolder);
  if (!existsSync(build)) throw new Error(`${buildFolder}/ is missing: run npm run build first`);
  const content = filesUnder(join(root, contentFolder), contentExtensions);
  const pages = filesUnder(build, new Set([".html"]));
  const placeholders = [...content, ...pages].flatMap((file) =>
    findPlaceholders(readFileSync(file, "utf8"), relative(root, file).replaceAll("\\", "/")),
  );
  const referenced = content
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => referencedFiles(JSON.parse(readFileSync(file, "utf8"))));
  const missingFiles = [...new Set(referenced)]
    .filter((file) => !existsSync(join(root, "public", file)))
    .map((file) => `public${file}`)
    .sort();
  return { placeholders, missingFiles };
}

/** The report as lines of text, and whether it found nothing. */
export function format(report: Report): { lines: string[]; clean: boolean } {
  const lines = [
    ...report.missingFiles.map((file) => `missing file: ${file}`),
    ...report.placeholders.map(({ file, line, text }) => `${file}:${line}: ${text}`),
  ];
  const clean = lines.length === 0;
  const summary = clean
    ? "No placeholder and no missing file."
    : `${report.placeholders.length} placeholder(s), ${report.missingFiles.length} missing file(s).`;
  return { lines: [...lines, summary], clean };
}

if (import.meta.main) {
  const { lines, clean } = format(check(process.cwd()));
  for (const line of lines) console.log(line);
  if (!clean) {
    if (process.env.ALLOW_TODO === "1") {
      console.log("ALLOW_TODO=1: reported only.");
    } else {
      process.exitCode = 1;
    }
  }
}
