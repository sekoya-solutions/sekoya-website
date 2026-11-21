import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { leaves, sharedLeaves } from "./leaves";

// The quiz's copy (src/content/quiz): every language has the same fields,
// questions, points, levels and links, and each level recommends the same
// offers of the offers page, by their ids in each language.
function read(collection: string, locale: string) {
  return JSON.parse(
    readFileSync(new URL(`./${collection}/${locale}.json`, import.meta.url), "utf8"),
  );
}

const quiz = Object.fromEntries(locales.map((locale) => [locale, read("quiz", locale)]));
const offers = Object.fromEntries(locales.map((locale) => [locale, read("offers", locale)]));

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(id|score|min|max|page|subject|variant)$/;

const shared = (entry: unknown) => sharedLeaves(entry, sharedFields);

describe("the quiz copy", () => {
  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(quiz[locale]).keys()]).toEqual([...leaves(quiz.fr).keys()]);
  });

  it.each(locales)("%s has the same questions, points, levels and links as French", (locale) => {
    expect(shared(quiz[locale])).toEqual(shared(quiz.fr));
  });

  it("has ten questions and three levels, so the comparison above checks something", () => {
    expect(quiz.fr.questions).toHaveLength(10);
    expect(shared(quiz.fr).filter(([path]) => path.endsWith(".page"))).toHaveLength(3);
  });

  it.each(locales)("%s recommends the same offers of its offers page as French", (locale) => {
    /** Each level's offers, as their places on the offers page of the language. */
    const places = (language: string) => {
      const ids = offers[language].items.map((item: { id: string }) => item.id);
      return quiz[language].levels.map((level: { offers: { offer: string }[] }) =>
        level.offers.map(({ offer }) => ids.indexOf(offer)),
      );
    };
    expect(places(locale).flat()).not.toContain(-1);
    expect(places(locale)).toEqual(places("fr"));
  });
});
