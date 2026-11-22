import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The offers page (#12): its content in both languages, the cards aligned
// row by row with CSS subgrid from 1024 px and stacked below, its links, its
// placeholders, and the home teaser's links to each card.

/** The offers copy of a language, as the content files write it. */
function offersCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/offers/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

/** The parts of a card, one per row of the shared grid, in order. */
const cardParts = [
  ".offer-icon",
  ".offer-title",
  ".offer-duration",
  ".offer-for",
  ".offer-deliverables",
];

/** Each card part's top edge in every card: one array per part, in card order. */
function partTops(page: Page): Promise<number[][]> {
  return page.evaluate(
    (selectors) =>
      selectors.map((selector) =>
        [...document.querySelectorAll(".offer")].map(
          (card) => card.querySelector(selector)?.getBoundingClientRect().top ?? Number.NaN,
        ),
      ),
    cardParts,
  );
}

for (const locale of locales) {
  test(`the offers page shows its copy in ${locale}`, async ({ page }) => {
    const copy = offersCopy(locale);
    await page.goto(pathOf("offers", locale));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(typeset(copy.title, locale));
    const cards = main.locator(".offer");
    await expect(cards).toHaveCount(3);
    for (const [index, offer] of copy.items.entries()) {
      const card = cards.nth(index);
      await expect(card).toHaveAttribute("id", offer.id);
      await expect(card.getByRole("heading", { level: 2 })).toHaveText(
        typeset(offer.title, locale),
      );
      await expect(card.getByRole("listitem")).toHaveCount(offer.deliverables.length);
    }
    await expect(main.locator(".step")).toHaveCount(3);
    await expect(
      main.getByRole("heading", { level: 2, name: typeset(copy.quiz.title, locale) }),
    ).toBeVisible();
  });
}

for (const width of [1024, 1440]) {
  test(`the offer cards line up row by row at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pathOf("offers", "fr"));
    const tops = await partTops(page);
    for (const [index, row] of tops.entries()) {
      for (const top of row) expect(top, cardParts[index]).toBeCloseTo(row[0] ?? Number.NaN, 0);
    }
    // The titles wrap differently, so the alignment comes from the shared rows.
    const titleHeights = await page
      .locator(".offer-title")
      .evaluateAll((titles) => titles.map((title) => title.getBoundingClientRect().height));
    expect(new Set(titleHeights).size).toBeGreaterThan(1);
  });
}

test("the offer cards stack at 390 px, with no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pathOf("offers", "fr"));
  const boxes = await page
    .locator(".offer")
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(3);
  for (const [index, box] of boxes.entries()) {
    expect(box.left).toBe(boxes[0].left);
    expect(box.width).toBe(boxes[0].width);
    if (index > 0) expect(box.top).toBeGreaterThan(boxes[index - 1].bottom);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("each offer links to the contact page with its subject preselected", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(pathOf("offers", locale));
    const hrefs = await page
      .getByRole("main")
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    // Then the quiz band's button.
    expect(hrefs).toEqual([
      ...["audit", "tech-lead", "sauvetage"].map(
        (subject) => `${pathOf("contact", locale)}?sujet=${subject}`,
      ),
      pathOf("quiz", locale),
    ]);
  }
});

test("the offers page shows the approved region, with no placeholder left", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(pathOf("offers", locale));
    // The region of the third step.
    await expect(page.getByRole("main")).toContainText("Île-de-France");
    await expect(page.getByRole("main").locator(".placeholder")).toHaveCount(0);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the offers page shows each card, step and the quiz band once in view", async ({ page }) => {
    await page.goto(pathOf("offers", "fr"));
    const elements = await page.locator(".reveal").all();
    // Three cards, three steps and the quiz band.
    expect(elements).toHaveLength(7);
    for (const element of elements) {
      await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
      // A scroll-driven animation follows the scroll.
      await expect
        .poll(() => element.evaluate((node) => Number(getComputedStyle(node).opacity)))
        .toBe(1);
    }
  });
});

for (const locale of locales) {
  test(`the home teaser's links land on each offer card in ${locale}`, async ({ page }) => {
    const copy = offersCopy(locale);
    for (const offer of copy.items) {
      await page.goto(pathOf("home", locale));
      await page.locator(`a[href="${pathOf("offers", locale)}#${offer.id}"]`).click();
      await expect(page).toHaveURL(`${pathOf("offers", locale)}#${offer.id}`);
      await expect(page.locator(`#${offer.id}`)).toBeInViewport();
    }
  });
}
