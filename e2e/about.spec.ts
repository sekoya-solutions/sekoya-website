import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { dictionaries } from "../src/i18n/index";
import { pathOf } from "../src/i18n/routes";

// The About page (#15): its copy in both languages, the brand avatar standing
// in for the photo, the `#ia` anchor, the AI workflow side by side from
// 1024 px and one under the other below, and the links to the AGENTS.md files.

/** The About copy of a language, as the content file writes it. */
function aboutCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/about/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

for (const locale of locales) {
  test(`the About page shows its copy in ${locale}`, async ({ page }) => {
    const copy = aboutCopy(locale);
    await page.goto(pathOf("about", locale));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(
      typeset(copy.hero.title, locale),
    );
    for (const title of [copy.values.title, copy.bring.title, copy.stack.title, copy.ai.title]) {
      await expect(
        main.getByRole("heading", { level: 2, name: typeset(title, locale), exact: true }),
      ).toBeVisible();
    }
    await expect(main.locator(".about-bio p")).toHaveCount(copy.hero.bio.length);
    await expect(main.locator(".about-bring li")).toHaveCount(copy.bring.items.length);
    const chips = copy.stack.groups.flatMap((group: { items: string[] }) => group.items);
    await expect(main.locator(".about-stack .chip")).toHaveText(
      chips.map((chip: string) => typeset(chip, locale)),
    );
    await expect(main.locator(".workflow-step")).toHaveCount(copy.ai.workflow.steps.length);
    await expect(main.locator(".about-guardrail")).toHaveCount(copy.ai.guardrails.items.length);
  });

  test(`the brand avatar stands in for the photo in ${locale}`, async ({ page }) => {
    const copy = aboutCopy(locale);
    await page.goto(pathOf("about", locale));
    const portrait = page.locator(".about-portrait");
    const image = portrait.getByRole("img");
    await expect(image).toHaveAttribute("alt", typeset(copy.hero.portrait.avatarAlt, locale));
    await expect(image).toHaveAttribute("src", /avatar.*\.svg$/);
    // Loaded, not broken.
    expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
    // The placeholder the guard reports until the photo is added.
    await expect(portrait.locator(".placeholder")).toHaveText(
      dictionaries[locale].about.photoMissing,
    );
  });

  test(`the #ia anchor lands on the AI section in ${locale}`, async ({ page }) => {
    const copy = aboutCopy(locale);
    await page.goto(`${pathOf("about", locale)}#ia`);
    const section = page.locator("#ia");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(
      typeset(copy.ai.title, locale),
    );
    await expect(section.getByRole("heading", { level: 2 })).toBeInViewport();
  });

  test(`the guardrails link to the AGENTS.md files in ${locale}`, async ({ page }) => {
    const copy = aboutCopy(locale);
    await page.goto(pathOf("about", locale));
    const links = copy.ai.guardrails.items.flatMap(
      (item: { links?: { href: string }[] }) => item.links ?? [],
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      await expect(page.locator(".about-guardrails").locator(`a[href="${link.href}"]`)).toHaveCount(
        1,
      );
    }
  });

  test(`the About page links to no page that does not exist yet in ${locale}`, async ({ page }) => {
    await page.goto(pathOf("about", locale));
    const closing = page.locator(".about-closing");
    const hrefs = await closing
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs).toEqual([pathOf("contact", locale), pathOf("offers", locale)]);
  });
}

/** The top and left edges of the workflow's nodes, in order. */
function nodeBoxes(page: import("@playwright/test").Page) {
  return page
    .locator(".workflow-node")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
}

for (const width of [1024, 1440]) {
  test(`the AI workflow runs left to right at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pathOf("about", "fr"));
    const boxes = await nodeBoxes(page);
    expect(boxes.length).toBeGreaterThan(1);
    for (const [index, box] of boxes.entries()) {
      expect(box.top).toBeCloseTo(boxes[0].top, 0);
      if (index > 0) expect(box.left).toBeGreaterThan(boxes[index - 1].right);
    }
  });
}

test("the AI workflow runs top to bottom at 390 px, with no horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pathOf("about", "fr"));
  const boxes = await nodeBoxes(page);
  for (const [index, box] of boxes.entries()) {
    expect(box.left).toBe(boxes[0].left);
    if (index > 0) expect(box.top).toBeGreaterThan(boxes[index - 1].bottom);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the About page's sections show once in view", async ({ page }) => {
    await page.goto(pathOf("about", "fr"));
    const elements = await page.locator(".reveal").all();
    expect(elements.length).toBeGreaterThan(0);
    for (const element of elements) {
      await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
      // A scroll-driven animation follows the scroll.
      await expect
        .poll(() => element.evaluate((node) => Number(getComputedStyle(node).opacity)))
        .toBe(1);
    }
  });
});
