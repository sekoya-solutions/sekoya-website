import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { featureTestPort, testimonialsFixtureFolder } from "../scripts/feature-test";
import { siteTestimonialsFolder, testimonialSlugs } from "../src/content/testimonials";
import { languages, locales } from "../src/i18n/config";
import { dictionaries } from "../src/i18n/index";
import { pathOf, testimonialsPaths } from "../src/i18n/routes";

// The testimonials (#23), on two builds. The feature test build reads the
// fixtures (scripts/feature-test.ts), which cover a translated quote and an
// untranslated one. The site reads its own folder: with none, no home
// section, no page, no footer link and no sitemap entry; with some, the same
// checks as the feature test build. Those checks: the home section between
// the portfolio and the quiz, the featured ones first; the page with every
// testimonial, the most recent first, each quote in its author's language or
// their translation; the footer link, the canonical URL, the alternates and
// the sitemap entry; no review data; and no accessibility violation.

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const site = "https://sekoyasolutions.com";

function read(path: string) {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
}

/** A testimonial as written in its file. */
interface Entry {
  slug: string;
  lang: string;
  quote: string;
  author: string;
  company: string;
  year: number;
  linkedin?: string;
  featured?: boolean;
  translations?: Record<string, { quote: string; role: string }>;
}

/** The testimonials of a folder, from the project's root. */
function entriesIn(folder: string): Entry[] {
  return testimonialSlugs(folder).map((slug) => ({ slug, ...read(`${folder}/${slug}.json`) }));
}

/** The most recent first; in the same year, by slug (src/lib/testimonials.ts). */
const byRecent = (a: Entry, b: Entry) =>
  b.year - a.year || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

/** The checks of a build with these testimonials, served at `baseURL`. */
function withTestimonials(title: string, baseURL: string | undefined, entries: Entry[]) {
  const recent = [...entries].sort(byRecent);
  const home = [
    ...recent.filter((item) => item.featured),
    ...recent.filter((item) => !item.featured),
  ]
    .slice(0, 3)
    .map((item) => item.author);

  test.describe(title, () => {
    if (baseURL !== undefined) test.use({ baseURL });

    for (const locale of locales) {
      const copy = read(`src/content/testimonials-page/${locale}.json`);
      const t = dictionaries[locale];
      /** What a page in this language shows of a testimonial. */
      const shown = (item: Entry) => {
        const translation = item.lang === locale ? undefined : item.translations?.[locale];
        return {
          quote: translation?.quote ?? item.quote,
          lang: translation === undefined ? item.lang : locale,
          note: translation === undefined ? undefined : copy.labels.translatedFrom[item.lang],
        };
      };

      test(`the home page shows the section between the portfolio and the quiz (${locale})`, async ({
        page,
      }) => {
        await page.goto(pathOf("home", locale));
        const headings = await page
          .locator("main h2")
          .evaluateAll((items) => items.map((h) => h.id));
        const at = headings.indexOf("testimonials-title");
        expect(at).toBeGreaterThan(-1);
        expect(headings[at - 1]).toBe("portfolio-title");
        expect(headings[at + 1]).toBe("quiz-title");
        const section = page.locator('section[aria-labelledby="testimonials-title"]');
        await expect(section.getByRole("heading", { level: 2 })).toHaveText(
          // French typography may turn spaces before punctuation into narrow ones.
          new RegExp(copy.home.title.replace(/[.?!]$/, "")),
        );
        // Up to three, the featured ones first.
        const cards = section.locator("figure");
        await expect(cards).toHaveCount(home.length);
        for (const [index, author] of home.entries()) {
          await expect(cards.nth(index)).toContainText(author);
        }
        const more = section.getByRole("link", { name: copy.home.more });
        await expect(more).toHaveAttribute("href", testimonialsPaths[locale]);
        await more.click();
        await expect(page).toHaveURL(testimonialsPaths[locale]);
      });

      test(`the page shows every testimonial, the most recent first (${locale})`, async ({
        page,
      }) => {
        const response = await page.goto(testimonialsPaths[locale]);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page).toHaveTitle(t.testimonials.title);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const cards = page.locator("main figure");
        await expect(cards).toHaveCount(recent.length);
        for (const [index, item] of recent.entries()) {
          const card = cards.nth(index);
          const { lang, note } = shown(item);
          const quote = card.locator("blockquote");
          await expect(card).toContainText(item.author);
          await expect(card).toContainText(item.company);
          if (lang === locale) await expect(quote).not.toHaveAttribute("lang");
          else await expect(quote).toHaveAttribute("lang", lang);
          if (note !== undefined) await expect(card).toContainText(note);
          else {
            for (const label of Object.values<string>(copy.labels.translatedFrom)) {
              await expect(card).not.toContainText(label);
            }
          }
          // French quotes get French typography; English ones are shown as written.
          if (lang === "en") await expect(quote).toHaveText(shown(item).quote);
          if (item.linkedin !== undefined) {
            const link = card.getByRole("link", { name: new RegExp(item.author) });
            await expect(link).toHaveAttribute("href", item.linkedin);
            const box = await link.boundingBox();
            expect(box?.width).toBeGreaterThanOrEqual(44);
            expect(box?.height).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test(`the page is listed: canonical, alternates, footer link, no review data (${locale})`, async ({
        page,
      }) => {
        await page.goto(testimonialsPaths[locale]);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          "href",
          `${site}${testimonialsPaths[locale]}`,
        );
        for (const other of locales) {
          await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
            "href",
            `${site}${testimonialsPaths[other]}`,
          );
        }
        const footer = page.getByRole("contentinfo");
        await expect(footer.getByRole("link", { name: t.layout.testimonials })).toHaveAttribute(
          "aria-current",
          "page",
        );
        const data = await page.locator('script[type="application/ld+json"]').allTextContents();
        expect(data.join()).not.toMatch(/Review|AggregateRating/);

        // The language switch lands on the same page in the other language.
        const other = locales.find((candidate) => candidate !== locale) ?? locale;
        await page
          .getByRole("banner")
          .getByRole("link", { name: `${languages[other].code} ${languages[other].name}` })
          .click();
        await expect(page).toHaveURL(testimonialsPaths[other]);
      });

      for (const path of [pathOf("home", locale), testimonialsPaths[locale]]) {
        for (const theme of ["dark", "light"] as const) {
          test(`${path} has no accessibility violations in the ${theme} theme`, async ({
            page,
          }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.addInitScript((stored) => localStorage.setItem("theme", stored), theme);
            await page.goto(path);
            const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
            expect(results.violations).toEqual([]);
          });
        }
      }
    }

    test("the sitemap lists the testimonials page in both languages", async ({ request }) => {
      const sitemap = await (await request.get("/sitemap.xml")).text();
      for (const locale of locales) {
        expect(sitemap).toContain(`<loc>${site}${testimonialsPaths[locale]}</loc>`);
      }
    });
  });
}

/** The checks of a build with no testimonial, served at the default address. */
function withoutTestimonials(title: string) {
  test.describe(title, () => {
    for (const locale of locales) {
      test(`the home page has no testimonials section (${locale})`, async ({ page }) => {
        await page.goto(pathOf("home", locale));
        await expect(page.locator("#portfolio-title")).toBeVisible();
        await expect(page.locator("#testimonials-title")).toHaveCount(0);
        await expect(page.locator("blockquote")).toHaveCount(0);
      });

      test(`there is no testimonials page, and no link to it (${locale})`, async ({ page }) => {
        const response = await page.goto(testimonialsPaths[locale]);
        expect(response?.status()).toBe(404);
        await page.goto(pathOf("home", locale));
        const t = dictionaries[locale].layout;
        await expect(page.getByRole("link", { name: t.testimonials })).toHaveCount(0);
        await expect(page.locator(`a[href="${testimonialsPaths[locale]}"]`)).toHaveCount(0);
      });
    }

    test("the sitemap does not list the testimonials page", async ({ request }) => {
      const sitemap = await (await request.get("/sitemap.xml")).text();
      expect(sitemap).toContain("<urlset");
      for (const locale of locales) expect(sitemap).not.toContain(testimonialsPaths[locale]);
    });
  });
}

const fixtures = entriesIn(testimonialsFixtureFolder);

test("the fixtures cover a translated quote and an untranslated one", () => {
  expect(fixtures.some((item) => item.translations !== undefined)).toBe(true);
  expect(fixtures.some((item) => item.translations === undefined)).toBe(true);
});

withTestimonials(
  "on the feature test build, with the fixtures",
  `http://localhost:${featureTestPort}`,
  fixtures,
);

const siteEntries = entriesIn(siteTestimonialsFolder);
if (siteEntries.length === 0) withoutTestimonials("on the site, with no testimonial");
else withTestimonials("on the site, with its testimonials", undefined, siteEntries);
