import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { caseStudyKey, pathOf } from "../src/i18n/routes";

// The home sections (#10): their content, in both languages, the scroll
// reveal in its three modes (CSS scroll-driven animations, the fallback
// script, no JavaScript), reduced motion, and the integration map's dots.

/** The home copy of a language, as the content files write it. */
function homeCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/home/${locale}.json`, import.meta.url), "utf8"),
  );
}

const sectionIds = [
  "values-title",
  "offers-title",
  "case-title",
  "portfolio-title",
  "quiz-title",
  "contact-title",
];

/**
 * Makes the page behave as a browser without CSS scroll-driven animations:
 * the stylesheets' feature queries test a property no browser has, and
 * `CSS.supports` answers no for it, as such a browser would.
 */
async function withoutScrollDrivenAnimations(page: Page) {
  await page.route("**/_astro/*.css", async (route) => {
    const response = await route.fetch();
    const css = (await response.text()).replaceAll(
      "animation-timeline:view()",
      "animation-timeline:not-a-timeline()",
    );
    await route.fulfill({ response, body: css });
  });
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((...args: [string, string?]) =>
      args.join(":").includes("animation-timeline")
        ? false
        : supports(...(args as [string]))) as typeof CSS.supports;
  });
}

/** The opacity of each reveal element, in page order. */
function revealOpacities(page: Page): Promise<number[]> {
  return page
    .locator(".reveal")
    .evaluateAll((elements) =>
      elements.map((element) => Number(getComputedStyle(element).opacity)),
    );
}

/** Scrolls each reveal element to the middle of the viewport, then returns its opacity. */
async function opacitiesOnceInView(page: Page): Promise<number[]> {
  const opacities: number[] = [];
  for (const element of await page.locator(".reveal").all()) {
    await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
    // A scroll-driven animation follows the scroll; a transition runs 0.6 s at most.
    await expect
      .poll(() => element.evaluate((node) => Number(getComputedStyle(node).opacity)))
      .toBe(1);
    opacities.push(await element.evaluate((node) => Number(getComputedStyle(node).opacity)));
  }
  return opacities;
}

test.describe("the home sections", () => {
  for (const locale of locales) {
    test(`are in order, with their copy, in ${locale}`, async ({ page }) => {
      const copy = homeCopy(locale);
      await page.goto(pathOf("home", locale));
      const headings = await page
        .getByRole("heading", { level: 2 })
        .evaluateAll((elements) => elements.map((element) => element.id));
      expect(headings).toEqual(sectionIds);
      const main = page.getByRole("main");
      for (const title of [copy.values.title, copy.offers.title, copy.contact.title]) {
        // French typography turns the space before a colon or question mark into a no-break space.
        await expect(main).toContainText(title.replaceAll(" ", " ").replace(/ (?=[:?!;])/g, " "));
      }
    });
  }

  test("link only to pages that exist: offers, the case study and other sites", async ({
    page,
  }) => {
    for (const locale of locales) {
      const offers = homeCopy(locale).offers.items.map(
        (item: { link: { hash: string } }) => `${pathOf("offers", locale)}#${item.link.hash}`,
      );
      await page.goto(pathOf("home", locale));
      const hrefs = await page
        .getByRole("main")
        .getByRole("link")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      // The hero's offers button, the offers teaser, the featured case study,
      // then the other sites; the other pages' links appear with their pages.
      expect(hrefs).toEqual([
        pathOf("offers", locale),
        ...offers,
        pathOf(caseStudyKey("sos-accessoire"), locale),
        "https://www.malt.fr/profile/fabricereynaud",
        "https://github.com/sekoya-solutions",
      ]);
    }
  });

  test("show their placeholders as chips", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(pathOf("home", locale));
      const chips = page.locator(".home-sections .placeholder");
      // Three results, the email and the LinkedIn address.
      await expect(chips).toHaveCount(5);
      for (const text of await chips.allTextContents()) expect(text).toMatch(/^\[TODO: .+\]$/);
    }
  });

  test("give a measured figure its date", async ({ page }) => {
    await page.goto(pathOf("home", "fr"));
    await expect(page.getByText("(mesuré le 17/11/2026)")).toBeVisible();
    await page.goto(pathOf("home", "en"));
    await expect(page.getByText("(measured on 17/11/2026)")).toBeVisible();
  });

  test("load the screenshots lazily, at a fixed size, described", async ({ page }) => {
    await page.goto("/");
    const images = page.locator(".home-sections img");
    await expect(images).toHaveCount(2);
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveAttribute("width", /^\d+$/);
      await expect(image).toHaveAttribute("height", /^\d+$/);
      expect(((await image.getAttribute("alt")) ?? "").length).toBeGreaterThan(20);
    }
  });

  test("label the quiz gauge as an example", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The gauge shows from 768 px.");
    await page.goto("/");
    const gauge = page.locator("figure.quiz-gauge");
    await expect(gauge).toContainText("11/20");
    await expect(gauge.locator("figcaption")).toHaveText("Exemple de résultat");
  });

  test("name the integration map's systems for screen readers", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The map shows from 1024 px.");
    await page.goto("/en");
    const map = page.getByRole("img", { name: /^The information system integrated/ });
    await expect(map).toBeVisible();
    await expect(map).toHaveAccessibleName(
      "The information system integrated around the shop. Next.js (E-commerce), Sage X3 (ERP), Salesforce (CRM), Speed WMS (Logistics), PrestaShop (Legacy), Blueway · Talend (Integration), AWS · Docker (Infra)",
    );
  });
});

test.describe("the scroll reveal", () => {
  test("uses CSS scroll-driven animations, with no script at work", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => CSS.supports("animation-timeline: view()"))).toBe(true);
    await expect(page.locator("html")).not.toHaveClass(/reveal-js/);
    const timelines = await page
      .locator(".reveal")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationTimeline),
      );
    for (const timeline of timelines) expect(timeline).toBe("view()");
    // The last section, below the fold, is hidden until it scrolls into view.
    expect((await revealOpacities(page)).at(-1)).toBe(0);
    expect(new Set(await opacitiesOnceInView(page))).toEqual(new Set([1]));
  });

  test("shows everything without JavaScript", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    expect(new Set(await opacitiesOnceInView(page))).toEqual(new Set([1]));
    await context.close();
  });

  test.describe("without CSS scroll-driven animations", () => {
    test("falls back to the script, hiding only what is below the fold", async ({ page }) => {
      await withoutScrollDrivenAnimations(page);
      await page.goto("/");
      await expect(page.locator("html")).toHaveClass(/reveal-js/);
      const inView = await page.locator(".reveal, .reveal-draw").evaluateAll((elements) =>
        elements.map((element) => ({
          above: element.getBoundingClientRect().top < window.innerHeight,
          revealed: element.classList.contains("in"),
        })),
      );
      // What was on screen at load is marked at once, so it never blinks out.
      for (const { above, revealed } of inView) expect(revealed).toBe(above);
      // What is below the fold is hidden at once, not faded out: no transition
      // runs on it, whatever the timing.
      const hidden = await page.locator(".reveal:not(.in)").evaluateAll((elements) =>
        elements.map((element) => ({
          opacity: Number(getComputedStyle(element).opacity),
          running: element.getAnimations().length,
        })),
      );
      expect(hidden.length).toBeGreaterThan(0);
      for (const state of hidden) expect(state).toEqual({ opacity: 0, running: 0 });
      expect(new Set(await opacitiesOnceInView(page))).toEqual(new Set([1]));
      // Every divider has been drawn: its cover has slid off.
      const covers = await page
        .locator(".divider-cover")
        .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).transform));
      for (const transform of covers) expect(transform).not.toBe("none");
    });

    test("shows everything without JavaScript", async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
      const page = await context.newPage();
      await withoutScrollDrivenAnimations(page);
      await page.goto("/");
      expect(new Set(await revealOpacities(page))).toEqual(new Set([1]));
      const covers = await page
        .locator(".divider-cover")
        .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).display));
      expect(new Set(covers)).toEqual(new Set(["none"]));
      await context.close();
    });
  });

  test("hides and animates nothing under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    expect(new Set(await revealOpacities(page))).toEqual(new Set([1]));
    await expect(page.locator("html")).not.toHaveClass(/reveal-js/);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    for (const selector of [".divider-cover", ".map-dot"]) {
      const displays = await page
        .locator(selector)
        .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).display));
      expect(new Set(displays), selector).toEqual(new Set(["none"]));
    }
  });
});

test("the integration map shows at most one travelling dot at a time", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The map shows from 1024 px.");
  await page.goto("/");
  const visibleCounts = await page.evaluate(() => {
    const animations = document
      .getAnimations()
      .filter((animation) => (animation as CSSAnimation).animationName === "map-travel");
    for (const animation of animations) animation.pause();
    const dots = [...document.querySelectorAll(".map-dot")];
    const counts: number[] = [];
    // Two full cycles of 10 s, every 100 ms.
    for (let time = 0; time <= 20_000; time += 100) {
      for (const animation of animations) animation.currentTime = time;
      counts.push(dots.filter((dot) => Number(getComputedStyle(dot).opacity) > 0).length);
    }
    return { animations: animations.length, counts };
  });
  expect(visibleCounts.animations).toBe(2);
  expect(Math.max(...visibleCounts.counts)).toBe(1);
  // Each dot travels in turn: some moments show one dot.
  expect(visibleCounts.counts).toContain(1);
});
