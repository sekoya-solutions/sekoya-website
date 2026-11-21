import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { leaves, sharedLeaves } from "./leaves";

// The home page's copy (src/content/home): every language has the same
// fields, and the same values wherever a value is not words: the pages linked
// to, the button styles, icons, images, external addresses, dates and scores.
const entries = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`./home/${locale}.json`, import.meta.url), "utf8")),
  ]),
);

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(page|variant|icon|image|href|measuredOn|score|max)$/;

const shared = (entry: unknown) => sharedLeaves(entry, sharedFields);

describe("the home copy", () => {
  const french = leaves(entries.fr);

  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(entries[locale]).keys()]).toEqual([...french.keys()]);
  });

  it.each(locales)("%s links to the same pages, with the same values, as French", (locale) => {
    expect(shared(entries[locale])).toEqual(shared(entries.fr));
  });

  it("has links, so the comparison above checks something", () => {
    expect(shared(entries.fr).filter(([path]) => path.endsWith(".page"))).toHaveLength(8);
  });
});
