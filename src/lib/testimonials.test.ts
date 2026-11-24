import { describe, expect, it } from "vitest";
import type { TestimonialData } from "../content/testimonial-schema";
import { byRecent, homeCount, onHome, type ShownTestimonial, shownIn } from "./testimonials";

// How the testimonials are shown (#23): the language of each quote, the
// page's order, and the home section's choice.

const english: TestimonialData = {
  lang: "en",
  quote: "An English quote.",
  author: "Jane Doe",
  role: "Head of engineering",
  company: "Example",
  year: 2025,
  consent: true,
  translations: { fr: { quote: "Une citation traduite.", role: "Responsable de l'ingénierie" } },
};

describe("a testimonial in a page's language", () => {
  it("is the original on a page in the quote's language", () => {
    expect(shownIn("jane", english, "en")).toMatchObject({
      quote: "An English quote.",
      role: "Head of engineering",
      lang: "en",
      translatedFrom: undefined,
    });
  });

  it("is the author's translation on a page in another language, marked as translated", () => {
    expect(shownIn("jane", english, "fr")).toMatchObject({
      quote: "Une citation traduite.",
      role: "Responsable de l'ingénierie",
      lang: "fr",
      translatedFrom: "en",
    });
  });

  it("is the original, in its own language, when there is no translation", () => {
    const { translations: _, ...untranslated } = english;
    expect(shownIn("jane", untranslated, "fr")).toMatchObject({
      quote: "An English quote.",
      lang: "en",
      translatedFrom: undefined,
    });
  });

  it("keeps the author's name, company and year, and is not featured by default", () => {
    expect(shownIn("jane", english, "fr")).toMatchObject({
      slug: "jane",
      author: "Jane Doe",
      company: "Example",
      year: 2025,
      linkedin: undefined,
      featured: false,
    });
  });
});

describe("the testimonials' order", () => {
  const item = (slug: string, year: number, featured = false): ShownTestimonial => ({
    ...shownIn(slug, english, "en"),
    year,
    featured,
  });

  it("puts the most recent first, then sorts a year by slug", () => {
    const list = [item("b", 2024), item("c", 2026), item("a", 2024)];
    expect(list.sort(byRecent).map(({ slug }) => slug)).toEqual(["c", "a", "b"]);
  });

  it(`shows at most ${homeCount} on the home page, the featured ones first`, () => {
    const list = [
      item("old-featured", 2020, true),
      item("recent", 2026),
      item("new-featured", 2024, true),
      item("middle", 2025),
      item("oldest", 2019),
    ];
    expect(onHome(list).map(({ slug }) => slug)).toEqual([
      "new-featured",
      "old-featured",
      "recent",
    ]);
  });

  it("shows the most recent on the home page when none is featured, and all when there are few", () => {
    expect(onHome([item("a", 2024), item("b", 2026)]).map(({ slug }) => slug)).toEqual(["b", "a"]);
    expect(onHome([])).toEqual([]);
  });
});
