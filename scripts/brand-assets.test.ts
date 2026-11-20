import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// LICENSE-ASSETS.md reserves the brand assets and lists where they are (ADR
// 0009). These tests keep that list in step with the files: a brand asset
// added outside the listed paths, or a listed path that no longer exists,
// fails here.
const root = fileURLToPath(new URL("..", import.meta.url));
const licence = readFileSync(join(root, "LICENSE-ASSETS.md"), "utf8");

/** The text of the level-2 section whose heading starts with `heading`. */
function section(heading: string): string {
  const start = licence.indexOf(`\n## ${heading}`);
  if (start === -1) throw new Error(`LICENSE-ASSETS.md has no "${heading}" section`);
  const end = licence.indexOf("\n## ", start + 1);
  return licence.slice(start, end === -1 ? undefined : end);
}

/** The repository paths (under `src/` or `public/`) a section names in code spans. */
function pathsIn(text: string): string[] {
  return [...text.matchAll(/`((?:src|public)\/[^`]*)`/g)].map((match) => match[1]);
}

/** Every file under a repository folder, as a repository path with `/` separators. */
function filesUnder(folder: string): string[] {
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"));
}

const brandPaths = pathsIn(section("Brand assets"));
const fontPaths = pathsIn(section("Font"));

/** True when `file` is a listed file or sits inside a listed folder. */
function isListed(file: string, listed: string[]): boolean {
  return listed.some((path) => (path.endsWith("/") ? file.startsWith(path) : file === path));
}

const fontExtensions = new Set([".woff2", ".woff", ".ttf", ".otf"]);
const imageExtensions = new Set([
  ".svg",
  ".png",
  ".ico",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
]);

describe("LICENSE-ASSETS.md", () => {
  it("lists only paths that exist", () => {
    expect(brandPaths.length).toBeGreaterThan(0);
    for (const path of [...brandPaths, ...fontPaths]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }
  });

  it("covers every file in src/assets/, the fonts under the font licence", () => {
    for (const file of filesUnder("src/assets")) {
      const listed = fontExtensions.has(extname(file)) || file.endsWith("/OFL.txt");
      expect(isListed(file, listed ? fontPaths : brandPaths), file).toBe(true);
    }
  });

  it("covers every image in public/", () => {
    for (const file of filesUnder("public").filter((f) => imageExtensions.has(extname(f)))) {
      expect(isListed(file, brandPaths), file).toBe(true);
    }
  });

  it("keeps the font licence next to every font file", () => {
    const fonts = [...filesUnder("src"), ...filesUnder("public")].filter((file) =>
      fontExtensions.has(extname(file)),
    );
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(existsSync(join(root, dirname(font), "OFL.txt")), font).toBe(true);
    }
  });
});
