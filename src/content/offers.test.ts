import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { leaves, sharedLeaves } from "./leaves";

// The offers page's copy (src/content/offers): every language has the same
// fields and links to the same pages, and each offer's anchor is the one the
// home page's offers teaser links to, in the same language.
function read(collection: string, locale: string) {
  return JSON.parse(
    readFileSync(new URL(`./${collection}/${locale}.json`, import.meta.url), "utf8"),
  );
}

const offers = Object.fromEntries(locales.map((locale) => [locale, read("offers", locale)]));
const home = Object.fromEntries(locales.map((locale) => [locale, read("home", locale)]));

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(page|subject|variant|icon)$/;

const shared = (entry: unknown) => sharedLeaves(entry, sharedFields);

describe("the offers copy", () => {
  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(offers[locale]).keys()]).toEqual([...leaves(offers.fr).keys()]);
  });

  it.each(locales)("%s links to the same pages, with the same values, as French", (locale) => {
    expect(shared(offers[locale])).toEqual(shared(offers.fr));
  });

  it("has links, so the comparison above checks something", () => {
    expect(shared(offers.fr).filter(([path]) => path.endsWith(".page"))).toHaveLength(4);
  });

  it.each(locales)("%s gives each offer the anchor the home teaser links to", (locale) => {
    const ids = offers[locale].items.map((item: { id: string }) => item.id);
    const teaserLinks = home[locale].offers.items.map(
      (item: { link: { page: string; hash: string } }) => item.link,
    );
    expect(teaserLinks).toEqual(ids.map((hash: string) => ({ page: "offers", hash })));
  });
});
