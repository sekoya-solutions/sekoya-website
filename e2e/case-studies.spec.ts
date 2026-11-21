import { existsSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { caseStudiesFolder, caseStudySlugs } from "../src/content/slugs";
import { locales } from "../src/i18n/config";
import { caseStudyKey, pathOf, type RouteKey, routes } from "../src/i18n/routes";

// The case studies (#13): the index and one page per case study, in both
// languages, from their files; the cards aligned row by row with CSS subgrid
// from 1024 px; placeholders shown as chips, results included; and the CV
// link or its placeholder.

/** The case studies' index copy of a language, as the content file writes it. */
function pageCopy(locale: string) {
  return JSON.parse(
    readFileSync(
      new URL(`../src/content/case-studies-page/${locale}.json`, import.meta.url),
      "utf8",
    ),
  );
}

/** A plain field of a case study's frontmatter, such as `company: Culligan`. */
function field(locale: string, slug: string, name: string): string {
  const file = new URL(`../${caseStudiesFolder}/${locale}/${slug}.mdx`, import.meta.url);
  const value = new RegExp(`^${name}: (.+)$`, "m").exec(readFileSync(file, "utf8"))?.[1];
  if (value === undefined) throw new Error(`${file} has no ${name}`);
  return value.replace(/^"(.*)"$/, "$1");
}

/** The slugs in their index order. */
const slugs = caseStudySlugs().sort(
  (a, b) => Number(field("fr", a, "order")) - Number(field("fr", b, "order")),
);

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

/** Each placeholder chip in the main content: its text, and its border style. */
function chips(page: Page) {
  return page
    .getByRole("main")
    .locator(".placeholder")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        text: element.textContent ?? "",
        border: getComputedStyle(element).borderTopStyle,
      })),
    );
}

/** The parts of a card, one per row of the shared grid, in order. */
const cardParts = [
  ":scope > .study-company",
  ":scope > .study-company + p",
  ":scope > .study-title",
  ":scope > ul",
  ":scope > .study-read",
];

/** Each card part's top edge in every card: one array per part, in card order. */
function partTops(page: Page): Promise<number[][]> {
  return page.evaluate(
    (selectors) =>
      selectors.map((selector) =>
        [...document.querySelectorAll(".study")].map(
          (card) => card.querySelector(selector)?.getBoundingClientRect().top ?? Number.NaN,
        ),
      ),
    cardParts,
  );
}

for (const locale of locales) {
  test(`the case studies' index lists every case study in ${locale}`, async ({ page }) => {
    const copy = pageCopy(locale);
    await page.goto(pathOf("caseStudies", locale));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(typeset(copy.title, locale));
    const cards = main.locator(".study");
    await expect(cards).toHaveCount(slugs.length);
    for (const [index, slug] of slugs.entries()) {
      const card = cards.nth(index);
      const link = card.getByRole("heading", { level: 2 }).getByRole("link");
      await expect(link).toHaveText(field(locale, slug, "company"));
      await expect(link).toHaveAttribute("href", pathOf(caseStudyKey(slug), locale));
      // At most three technologies.
      expect(await card.locator("ul li").count()).toBeLessThanOrEqual(3);
    }
    await cards.first().getByRole("link").click();
    await expect(page).toHaveURL(pathOf(caseStudyKey(slugs[0] ?? ""), locale));
  });

  test(`the CV is offered once its file exists, in ${locale}`, async ({ page }) => {
    const copy = pageCopy(locale);
    await page.goto(pathOf("caseStudies", locale));
    const main = page.getByRole("main");
    const cvLinks = main.locator(`a[href="${copy.cv.file}"]`);
    await expect(main.getByText(typeset(copy.cv.note, locale))).toBeVisible();
    if (existsSync(new URL(`../public${copy.cv.file}`, import.meta.url))) {
      await expect(cvLinks).toHaveText(copy.cv.label);
      expect((await page.request.get(copy.cv.file)).status()).toBe(200);
    } else {
      // No broken link: a placeholder, which the placeholder guard reports.
      await expect(cvLinks).toHaveCount(0);
      await expect(main.locator(".studies-cv .placeholder")).toHaveText(/^\[TODO: CV .+\]$/);
    }
  });

  for (const slug of slugs) {
    test(`the ${slug} case study shows its parts in ${locale}`, async ({ page }) => {
      const copy = pageCopy(locale);
      await page.goto(pathOf(caseStudyKey(slug), locale));
      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1 })).toHaveText(
        field(locale, slug, "company"),
      );
      const { context, work, results, stack } = copy.labels;
      await expect(main.getByRole("heading", { level: 2 })).toHaveText(
        [context, work, results, stack, copy.closing.title].map((text) => typeset(text, locale)),
      );
      await expect(main.locator(".study-body")).not.toBeEmpty();
      await expect(main.locator(".study-actions li")).not.toHaveCount(0);
      await expect(main.locator(".metric")).not.toHaveCount(0);
      // Back to the index, then the closing band's pages that exist.
      const hrefs = await main
        .getByRole("link")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      const closing = copy.closing.actions
        .map((action: { page: string }) => action.page)
        .filter((key: string) => Object.hasOwn(routes, key))
        .map((key: RouteKey) => pathOf(key, locale));
      expect(hrefs).toEqual([pathOf("caseStudies", locale), ...closing]);
    });
  }

  test(`the case studies show their placeholders as dashed chips in ${locale}`, async ({
    page,
  }) => {
    for (const path of [
      pathOf("caseStudies", locale),
      ...slugs.map((slug) => pathOf(caseStudyKey(slug), locale)),
    ]) {
      await page.goto(path);
      for (const chip of await chips(page)) {
        expect(chip.text).toMatch(/^\[TODO: .+\]$/);
        expect(chip.border).toBe("dashed");
      }
      // No placeholder outside a chip.
      const text = (await page.getByRole("main").textContent()) ?? "";
      const inChips = (await chips(page)).map((chip) => chip.text).join("");
      expect(text.match(/\[TODO/g)?.length ?? 0).toBe(inChips.match(/\[TODO/g)?.length ?? 0);
    }
  });

  test(`a result still to measure is a dashed chip, not a figure, in ${locale}`, async ({
    page,
  }) => {
    let pending = 0;
    for (const slug of slugs) {
      await page.goto(pathOf(caseStudyKey(slug), locale));
      for (const metric of await page.locator(".metric").all()) {
        const placeholder = metric.locator(":scope > .placeholder");
        if ((await placeholder.count()) === 0) {
          await expect(metric.locator(".metric-value")).toBeVisible();
          continue;
        }
        pending += 1;
        await expect(metric.locator(".metric-value")).toHaveCount(0);
        await expect(placeholder).toHaveCSS("border-top-style", "dashed");
        // At text size, never as a large number.
        const size = await placeholder.evaluate((node) =>
          Number.parseFloat(getComputedStyle(node).fontSize),
        );
        expect(size).toBeLessThan(18);
      }
    }
    // The current content has results still to measure, so this checks something.
    expect(pending).toBeGreaterThan(0);
  });
}

test("the case study cards line up row by row from 1024 px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Checked at desktop widths.");
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pathOf("caseStudies", "fr"));
    for (const tops of await partTops(page)) {
      expect(tops.every((top) => Math.abs(top - (tops[0] ?? Number.NaN)) < 1)).toBe(true);
    }
  }
});

test("the case study cards stack at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pathOf("caseStudies", "fr"));
  const boxes = await page
    .locator(".study")
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  for (const [index, box] of boxes.entries()) {
    expect(box.width).toBeGreaterThan(300);
    if (index > 0) expect(box.top).toBeGreaterThan((boxes[index - 1]?.bottom ?? 0) - 1);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("the home page's featured case links to its case study", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(pathOf("home", locale));
    await page.locator(`a[href="${pathOf(caseStudyKey("sos-accessoire"), locale)}"]`).click();
    await expect(page).toHaveURL(pathOf(caseStudyKey("sos-accessoire"), locale));
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the case study cards and the CV show once in view", async ({ page }) => {
    await page.goto(pathOf("caseStudies", "fr"));
    const elements = await page.locator(".reveal").all();
    expect(elements).toHaveLength(slugs.length + 1);
    for (const element of elements) {
      await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
      await expect
        .poll(() => element.evaluate((node) => Number(getComputedStyle(node).opacity)))
        .toBe(1);
    }
  });
});
