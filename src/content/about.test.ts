import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { leaves, sharedLeaves } from "./leaves";

// The About page's copy (src/content/about): every language has the same
// fields, links to the same pages and sites, and keeps the same `#ia` anchor.
function read(locale: string) {
  return JSON.parse(readFileSync(new URL(`./about/${locale}.json`, import.meta.url), "utf8"));
}

const about = Object.fromEntries(locales.map((locale) => [locale, read(locale)]));

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(page|variant|icon|href|id)$/;

const shared = (entry: unknown) => sharedLeaves(entry, sharedFields);

describe("the About copy", () => {
  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(about[locale]).keys()]).toEqual([...leaves(about.fr).keys()]);
  });

  it.each(locales)("%s links to the same pages and sites as French", (locale) => {
    expect(shared(about[locale])).toEqual(shared(about.fr));
  });

  it("has links and the anchor, so the comparison above checks something", () => {
    const paths = shared(about.fr).map(([path]) => path);
    expect(paths.filter((path) => path.endsWith(".page"))).toHaveLength(2);
    expect(paths.filter((path) => path.endsWith(".href"))).toHaveLength(2);
    expect(about.fr.ai.id).toBe("ia");
  });
});
