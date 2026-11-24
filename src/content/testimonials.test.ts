import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { testimonialsFixtureFolder } from "../../scripts/feature-test";
import { maxQuoteLength, testimonialSchema } from "./testimonial-schema";
import {
  hasTestimonials,
  siteTestimonialsFolder,
  testimonialSlugs,
  testimonialsFolder,
  testimonialsFolderVariable,
} from "./testimonials";

// The testimonials (#23): the folder the build reads, empty on the site, and
// the schema every testimonial must pass, consent first.

const fixture = (slug: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../../${testimonialsFixtureFolder}/${slug}.json`, import.meta.url),
      "utf8",
    ),
  );

const valid = {
  lang: "fr",
  quote: "Une citation.",
  author: "Prénom Nom",
  role: "Rôle",
  company: "Entreprise",
  year: 2026,
  consent: true,
};

describe("the testimonials folder", () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  });

  /** A project root with a testimonials folder holding these files. */
  function rootWith(files: string[]): string {
    const root = mkdtempSync(join(tmpdir(), "testimonials-"));
    folders.push(root);
    mkdirSync(join(root, siteTestimonialsFolder), { recursive: true });
    for (const file of files) writeFileSync(join(root, siteTestimonialsFolder, file), "{}");
    return root;
  }

  it("is the site's own, unless the test build names another", () => {
    expect(testimonialsFolder({})).toBe(siteTestimonialsFolder);
    expect(testimonialsFolder({ [testimonialsFolderVariable]: " " })).toBe(siteTestimonialsFolder);
    expect(testimonialsFolder({ [testimonialsFolderVariable]: testimonialsFixtureFolder })).toBe(
      testimonialsFixtureFolder,
    );
  });

  it("holds no testimonial on the site, so the site shows none", () => {
    expect(testimonialSlugs(siteTestimonialsFolder)).toEqual([]);
    expect(hasTestimonials(siteTestimonialsFolder)).toBe(false);
  });

  it("gives the slugs of its JSON files, sorted, and skips its README", () => {
    const root = rootWith(["second.json", "README.md", "first-one.json"]);
    expect(testimonialSlugs(siteTestimonialsFolder, root)).toEqual(["first-one", "second"]);
    expect(hasTestimonials(siteTestimonialsFolder, root)).toBe(true);
  });

  it("rejects any other file, and a missing folder", () => {
    expect(() => testimonialSlugs(siteTestimonialsFolder, rootWith(["Jane.json"]))).toThrow(
      /not a testimonial/,
    );
    expect(() => testimonialSlugs(siteTestimonialsFolder, rootWith(["notes.txt"]))).toThrow(
      /not a testimonial/,
    );
    expect(() => testimonialSlugs("missing", rootWith([]))).toThrow(/missing is missing/);
  });

  it("has fixtures for the test build, which pass the schema", () => {
    const slugs = testimonialSlugs(testimonialsFixtureFolder);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) expect(testimonialSchema.safeParse(fixture(slug)).success).toBe(true);
  });
});

describe("a testimonial's schema", () => {
  const parse = (data: unknown) => testimonialSchema.safeParse(data);

  it("accepts a testimonial with its author's consent", () => {
    expect(parse(valid).success).toBe(true);
  });

  it("rejects one without consent, or with anything but `true`", () => {
    const { consent: _, ...withoutConsent } = valid;
    expect(parse(withoutConsent).success).toBe(false);
    expect(parse({ ...valid, consent: false }).success).toBe(false);
    expect(parse({ ...valid, consent: "yes" }).success).toBe(false);
  });

  it(`rejects a quote longer than ${maxQuoteLength} characters, in the original or a translation`, () => {
    const long = "a".repeat(maxQuoteLength + 1);
    expect(parse({ ...valid, quote: "a".repeat(maxQuoteLength) }).success).toBe(true);
    expect(parse({ ...valid, quote: long }).success).toBe(false);
    expect(parse({ ...valid, translations: { en: { quote: long, role: "Role" } } }).success).toBe(
      false,
    );
  });

  it("rejects a placeholder anywhere: a testimonial is never invented", () => {
    expect(parse({ ...valid, author: "[TODO: nom]" }).success).toBe(false);
    expect(
      parse({ ...valid, translations: { en: { quote: "[TODO: traduction]", role: "Role" } } })
        .success,
    ).toBe(false);
  });

  it("accepts a translation into another language only", () => {
    expect(
      parse({ ...valid, translations: { en: { quote: "A quote.", role: "Role" } } }).success,
    ).toBe(true);
    expect(
      parse({ ...valid, translations: { fr: { quote: "Autre.", role: "Rôle" } } }).success,
    ).toBe(false);
    expect(
      parse({ ...valid, translations: { de: { quote: "Zitat.", role: "Rolle" } } }).success,
    ).toBe(false);
  });

  it("accepts a LinkedIn profile over HTTPS only", () => {
    expect(parse({ ...valid, linkedin: "https://www.linkedin.com/in/someone" }).success).toBe(true);
    expect(parse({ ...valid, linkedin: "http://www.linkedin.com/in/someone" }).success).toBe(false);
    expect(parse({ ...valid, linkedin: "https://example.com/in/someone" }).success).toBe(false);
  });

  it("rejects an unknown field, such as a misspelt one", () => {
    expect(parse({ ...valid, featurd: true }).success).toBe(false);
  });
});
