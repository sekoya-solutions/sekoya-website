import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { leaves, sharedLeaves } from "./leaves";

// The case studies' index copy (src/content/case-studies-page): every
// language has the same fields, links to the same pages and points to the
// same CV.
function read(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`./case-studies-page/${locale}.json`, import.meta.url), "utf8"),
  );
}

const copy = Object.fromEntries(locales.map((locale) => [locale, read(locale)]));

/** The fields whose value is the same in every language. */
const shared = (entry: unknown) => sharedLeaves(entry, /(^|\.)(page|variant|file)$/);

describe("the case studies' index copy", () => {
  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(copy[locale]).keys()]).toEqual([...leaves(copy.fr).keys()]);
  });

  it.each(locales)("%s links to the same pages and the same CV as French", (locale) => {
    expect(shared(copy[locale])).toEqual(shared(copy.fr));
  });

  it("has links and a CV, so the comparison above checks something", () => {
    expect(shared(copy.fr).map(([path]) => path)).toEqual([
      "cv.file",
      "closing.actions.0.page",
      "closing.actions.0.variant",
      "closing.actions.1.page",
      "closing.actions.1.variant",
    ]);
  });
});
