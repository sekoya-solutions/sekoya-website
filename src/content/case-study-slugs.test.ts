import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { caseStudiesFolder, caseStudySlugs, slugOf } from "./case-study-slugs";

let root = "";

/** A project with the given case study files, per language. */
function project(files: Record<string, string[]>): string {
  root = mkdtempSync(join(tmpdir(), "case-studies-"));
  for (const [locale, names] of Object.entries(files)) {
    const folder = join(root, caseStudiesFolder, locale);
    mkdirSync(folder, { recursive: true });
    for (const name of names) writeFileSync(join(folder, name), "---\n---\n");
  }
  return root;
}

afterEach(() => {
  if (root !== "") rmSync(root, { recursive: true, force: true });
  root = "";
});

describe("slugOf", () => {
  it("reads a case study's slug from its file name", () => {
    expect(slugOf("sos-accessoire.mdx")).toBe("sos-accessoire");
    expect(slugOf("atos-bull.mdx")).toBe("atos-bull");
  });

  it("rejects another file, or a name that is not a lowercase slug", () => {
    for (const name of ["notes.md", "Culligan.mdx", "a_b.mdx", "-a.mdx", "a--b.mdx", ".mdx"]) {
      expect(slugOf(name)).toBeUndefined();
    }
  });
});

describe("caseStudySlugs", () => {
  it("lists the slugs every language has, sorted", () => {
    const files = ["b.mdx", "a.mdx"];
    expect(caseStudySlugs(project({ fr: files, en: files }))).toEqual(["a", "b"]);
  });

  it("throws when a language misses a case study", () => {
    expect(() => caseStudySlugs(project({ fr: ["a.mdx", "b.mdx"], en: ["a.mdx"] }))).toThrow(
      "The case studies differ between fr (a, b) and en (a)",
    );
  });

  it("throws when a language's folder is missing", () => {
    expect(() => caseStudySlugs(project({ fr: ["a.mdx"] }))).toThrow(/en is missing$/);
  });

  it("throws on a file that is not a case study", () => {
    expect(() => caseStudySlugs(project({ fr: ["a.mdx", "draft.txt"], en: ["a.mdx"] }))).toThrow(
      "draft.txt is not a case study",
    );
  });

  it("reads the project's own case studies", () => {
    expect(caseStudySlugs()).toEqual(["atos-bull", "culligan", "sos-accessoire"]);
  });
});
