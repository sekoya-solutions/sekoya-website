import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { leaves, sharedLeaves } from "./leaves";

// The career page's copy (src/content/career, #18): every language has the
// same fields and the same positions, with the same dates and case studies.
function read(locale: string) {
  return JSON.parse(readFileSync(new URL(`./career/${locale}.json`, import.meta.url), "utf8"));
}

const career = Object.fromEntries(locales.map((locale) => [locale, read(locale)]));

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(initial|slug|company|end|caseStudy)$|^positions\.\d+\.start$/;

/** A date's placeholder is translated; a date is not. */
const shared = (entry: unknown) =>
  sharedLeaves(entry, sharedFields).map(([path, value]) => [
    path,
    typeof value === "string" && value.startsWith("[TODO:") ? "[TODO]" : value,
  ]);

describe("the career copy", () => {
  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(career[locale]).keys()]).toEqual([...leaves(career.fr).keys()]);
  });

  it.each(locales)("%s has the same positions, dates and case studies as French", (locale) => {
    expect(shared(career[locale])).toEqual(shared(career.fr));
  });

  it("has positions, so the comparison above checks something", () => {
    expect(shared(career.fr).filter(([path]) => String(path).endsWith(".slug"))).toHaveLength(4);
  });
});
