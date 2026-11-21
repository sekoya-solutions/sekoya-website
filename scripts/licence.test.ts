import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// LICENSE reserves all rights on the whole repository, except the font files,
// which keep the SIL Open Font License (ADR 0009). These tests keep that
// exception true: every font file sits in a folder LICENSE names, next to the
// licence's text.
const root = fileURLToPath(new URL("..", import.meta.url));
const licence = readFileSync(join(root, "LICENSE"), "utf8");

/** Every file under a repository folder, as a repository path with `/` separators. */
function filesUnder(folder: string): string[] {
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"));
}

const fontExtensions = new Set([".woff2", ".woff", ".ttf", ".otf"]);
const fonts = [...filesUnder("src"), ...filesUnder("public")].filter((file) =>
  fontExtensions.has(extname(file)),
);

describe("LICENSE", () => {
  it("reserves all rights", () => {
    expect(licence).toContain("All rights reserved.");
    expect(licence).not.toMatch(/\bMIT\b/);
  });

  it("names the folder of every font file as the font exception", () => {
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(licence, font).toContain(`${dirname(font)}/`);
      expect(licence, font).toContain(`${dirname(font)}/OFL.txt`);
    }
  });

  it("keeps the font licence next to every font file", () => {
    for (const font of fonts) {
      expect(existsSync(join(root, dirname(font), "OFL.txt")), font).toBe(true);
    }
  });
});
