import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { check, findPlaceholders, format, referencedFiles } from "./check-todos.ts";

let root = "";

/** A project with the given files, by path from its root. */
function project(files: Record<string, string>): string {
  root = mkdtempSync(join(tmpdir(), "check-todos-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

afterEach(() => {
  if (root !== "") rmSync(root, { recursive: true, force: true });
  root = "";
});

describe("findPlaceholders", () => {
  it("finds every placeholder with its line", () => {
    expect(findPlaceholders("a [TODO: b]\nc\n[TODO: d] [TODO: e]", "f")).toEqual([
      { file: "f", line: 1, text: "[TODO: b]" },
      { file: "f", line: 3, text: "[TODO: d]" },
      { file: "f", line: 3, text: "[TODO: e]" },
    ]);
  });

  it("finds an unclosed or unlabelled one too", () => {
    expect(findPlaceholders("[TODO]\n[TODO: never closed", "f").map(({ text }) => text)).toEqual([
      "[TODO]",
      "[TODO: never closed",
    ]);
  });
});

describe("referencedFiles", () => {
  it("collects every string under a key named file", () => {
    expect(
      referencedFiles({ cv: { file: "/cv.pdf" }, items: [{ file: "/a.pdf" }, "file"] }),
    ).toEqual(["/cv.pdf", "/a.pdf"]);
  });
});

describe("check", () => {
  const clean = {
    "src/content/page/fr.json": JSON.stringify({ cv: { file: "/cv.pdf" } }),
    "src/content/studies/fr/a.mdx": "Text.",
    "public/cv.pdf": "",
    "dist/index.html": "<p>Text.</p>",
  };

  it("passes a project with no placeholder and every file", () => {
    const report = check(project(clean));
    expect(report).toEqual({ placeholders: [], missingFiles: [] });
    expect(format(report)).toEqual({ lines: ["No placeholder and no missing file."], clean: true });
  });

  it("reports placeholders in the content and the built pages, and missing files", () => {
    const { "public/cv.pdf": _, ...withoutCv } = clean;
    const report = check(
      project({
        ...withoutCv,
        "src/content/studies/fr/a.mdx": "Text.\n[TODO: context]",
        "dist/en/page.html": "<span>[TODO: CV]</span>",
        "src/content/notes.txt": "[TODO: not content]",
      }),
    );
    expect(report).toEqual({
      placeholders: [
        { file: "src/content/studies/fr/a.mdx", line: 2, text: "[TODO: context]" },
        { file: "dist/en/page.html", line: 1, text: "[TODO: CV]" },
      ],
      missingFiles: ["public/cv.pdf"],
    });
    expect(format(report)).toEqual({
      lines: [
        "missing file: public/cv.pdf",
        "src/content/studies/fr/a.mdx:2: [TODO: context]",
        "dist/en/page.html:1: [TODO: CV]",
        "2 placeholder(s), 1 missing file(s).",
      ],
      clean: false,
    });
  });

  it("asks for the build when there is none", () => {
    const { "dist/index.html": _, ...withoutBuild } = clean;
    expect(() => check(project(withoutBuild))).toThrow("dist/ is missing: run npm run build first");
  });
});
