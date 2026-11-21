import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { caseStudySlugs, projectSlugs } from "../src/content/slugs";
import { locales } from "../src/i18n/config";
import { dictionaries } from "../src/i18n/index";
import { type NavigationPage, navigationPages } from "../src/i18n/navigation";
import {
  caseStudyKey,
  isRouteKey,
  pathOf,
  projectKey,
  type RouteKey,
  routes,
} from "../src/i18n/routes";

// The header's navigation (src/components/layout/Header.astro): from
// 1280 px, the links and the contact button in one row; below, a menu built
// on <details>, which works with no JavaScript and with the keyboard.

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const wide = { width: 1440, height: 900 };
const narrow = { width: 390, height: 844 };

// The tests set their own viewport, so the desktop project alone runs them.
test.skip(({ isMobile }) => isMobile, "The tests set their own viewport.");

/** The main pages built so far, which the navigation links. */
const builtPages = navigationPages.filter((page): page is NavigationPage & RouteKey =>
  isRouteKey(page),
);

/** The navigation shown in the header. */
function navigation(page: Page) {
  return page.getByRole("banner").getByRole("navigation");
}

/** The menu's button, below 1280 px, named in the page's language. */
function menuButton(page: Page, locale: (typeof locales)[number]) {
  return page.locator("header details > summary", {
    hasText: dictionaries[locale].layout.menu,
  });
}

for (const locale of locales) {
  const t = dictionaries[locale].layout;

  test(`from 1280 px, the row links the main pages and contact (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pathOf("home", locale));
    const nav = navigation(page);
    await expect(nav).toHaveAccessibleName(t.navigation);
    const links = nav.getByRole("link");
    await expect(links).toHaveText(builtPages.map((key) => t.nav[key]));
    for (const [index, key] of builtPages.entries()) {
      await expect(links.nth(index)).toHaveAttribute("href", pathOf(key, locale));
    }
    // The career page is not built yet, so it has no link.
    await expect(nav.getByRole("link", { name: t.nav.career })).toHaveCount(0);
    const contact = page.getByRole("banner").getByRole("link", { name: t.contact });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute("href", pathOf("contact", locale));
    await expect(menuButton(page, locale)).toBeHidden();
  });

  test(`below 1280 px, the links are in the menu (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 1279, height: 800 });
    await page.goto(pathOf("home", locale));
    await expect(navigation(page)).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("link", { name: t.contact })).toBeHidden();
    await menuButton(page, locale).click();
    const links = navigation(page).getByRole("link");
    await expect(links).toHaveText([...builtPages.map((key) => t.nav[key]), t.contact]);
    await expect(links.last()).toHaveAttribute("href", pathOf("contact", locale));
    // The menu drops over the page: it does not widen it.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1279,
    );
  });
}

test("the current page is marked, and a case study or project marks its section", async ({
  page,
}) => {
  await page.setViewportSize(wide);
  const t = dictionaries.fr.layout;
  const current = () =>
    navigation(page)
      .locator("[aria-current]")
      .evaluateAll((elements) =>
        elements.map((element) => [element.textContent?.trim(), element.ariaCurrent]),
      );

  for (const key of builtPages) {
    await page.goto(pathOf(key, "fr"));
    expect(await current()).toEqual([[t.nav[key], "page"]]);
  }
  await page.goto(pathOf(caseStudyKey(caseStudySlugs()[0]), "fr"));
  expect(await current()).toEqual([[t.nav.caseStudies, "true"]]);
  await page.goto(pathOf(projectKey(projectSlugs()[0]), "fr"));
  expect(await current()).toEqual([[t.nav.portfolio, "true"]]);
  await page.goto(pathOf("home", "fr"));
  expect(await current()).toEqual([]);

  await page.goto(pathOf("contact", "fr"));
  expect(await current()).toEqual([]);
  await expect(page.getByRole("banner").getByRole("link", { name: t.contact })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the menu opens and closes with the keyboard, and Tab leaves it", async ({ page }) => {
  await page.setViewportSize(narrow);
  await page.goto(pathOf("home", "fr"));
  const t = dictionaries.fr.layout;
  const menu = page.locator("header details");
  const button = menu.locator("summary");
  const links = menu.getByRole("link");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("open", "");
  // Tab goes through the links, then the contact button, then out of the header.
  for (const name of [...builtPages.map((key) => t.nav[key]), t.contact]) {
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("link", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("header") ?? null)).toBeNull();

  // Enter closes it from its button, and Space opens it.
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(menu).not.toHaveAttribute("open");
  await expect(links.first()).toBeHidden();
  await page.keyboard.press("Space");
  await expect(menu).toHaveAttribute("open", "");
  await expect(links.first()).toBeVisible();
});

test("the open menu stands apart from the page, in both themes", async ({ page }) => {
  await page.setViewportSize(narrow);
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript((stored) => localStorage.setItem("theme", stored), theme);
    await page.goto(pathOf("about", "fr"));
    const header = page.getByRole("banner");
    const panel = navigation(page);
    const background = (locator: typeof header) =>
      locator.evaluate((element) => getComputedStyle(element).backgroundColor);
    const pageBackground = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    // Closed, the bar sits on the page.
    expect(await background(header)).toBe("rgba(0, 0, 0, 0)");
    await menuButton(page, "fr").click();
    // Open, the bar and the panel share one surface, unlike the page's, and
    // a scrim (a shadow spread over the screen) dims the page below.
    const surface = await background(panel);
    expect(surface).not.toBe(pageBackground);
    expect(await background(header)).toBe(surface);
    expect(await panel.evaluate((element) => getComputedStyle(element).boxShadow)).toMatch(
      /^rgba\(.+\) 0px 0px 0px \d+(\.\d+)?px$/,
    );
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the menu opens and its links work", async ({ page }) => {
    await page.setViewportSize(narrow);
    await page.goto(pathOf("home", "en"));
    const t = dictionaries.en.layout;
    await menuButton(page, "en").click();
    await navigation(page).getByRole("link", { name: t.nav.about }).click();
    await expect(page).toHaveURL(pathOf("about", "en"));
  });
});

// Every route, in both languages, at 1440 px and at 390 px with the menu
// open, has no accessibility violations.
for (const key of Object.keys(routes) as RouteKey[]) {
  for (const locale of locales) {
    const path = pathOf(key, locale);
    test(`${path} has no accessibility violations at 1440 and 390 px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize(wide);
      await page.goto(path);
      expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);

      await page.setViewportSize(narrow);
      await page.reload();
      await menuButton(page, locale).click();
      await expect(navigation(page)).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);
    });
  }
}
