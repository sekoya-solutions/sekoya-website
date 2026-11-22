import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { dictionaries } from "../src/i18n/index";
import { footerPages } from "../src/i18n/navigation";
import { pathOf, type RouteKey, routes } from "../src/i18n/routes";

// The footer's brand and navigation columns (#48), beside the measured
// column (site-scores.spec.ts): three columns side by side on wide screens,
// stacked on phones, with the copyright line and the legal notice under them.

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const wide = { width: 1440, height: 900 };
const narrow = { width: 390, height: 844 };

const company = JSON.parse(
  readFileSync(new URL("../src/content/company/company.json", import.meta.url), "utf8"),
);

// The tests set their own viewport, so the desktop project alone runs them.
test.skip(({ isMobile }) => isMobile, "The tests set their own viewport.");

/** The footer's three columns, in their order. */
function columns(page: Page) {
  return page.locator("footer .footer-columns > *");
}

for (const locale of locales) {
  const t = dictionaries[locale].layout;
  const labels: Record<(typeof footerPages)[number], string> = {
    ...t.nav,
    quiz: t.quiz,
    contact: t.footer.contact,
  };

  test(`the brand column shows the logo, the tagline and the company line (${locale})`, async ({
    page,
  }) => {
    await page.goto(pathOf("home", locale));
    const brand = page.locator("footer .footer-brand");
    await expect(brand.getByRole("img", { name: "Sekoya Solutions" })).toBeVisible();
    await expect(brand).toContainText(t.footer.tagline);
    await expect(brand).toContainText(
      `${t.footer.legalForm} ${company.name} — ${company.registration}`,
    );
  });

  test(`the navigation column links the pages, the quiz and contact (${locale})`, async ({
    page,
  }) => {
    await page.goto(pathOf("quiz", locale));
    const nav = page
      .getByRole("contentinfo")
      .getByRole("navigation", { name: t.footer.navigation });
    const links = nav.getByRole("link");
    await expect(links).toHaveText(footerPages.map((key) => labels[key]));
    for (const [index, key] of footerPages.entries()) {
      await expect(links.nth(index)).toHaveAttribute("href", pathOf(key, locale));
    }
    // The page shown is marked, and only it.
    await expect(nav.locator("[aria-current]")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: t.quiz })).toHaveAttribute("aria-current", "page");
  });

  test(`the columns sit side by side at 1440 px and stack at 390 px (${locale})`, async ({
    page,
  }) => {
    await page.setViewportSize(wide);
    await page.goto(pathOf("home", locale));
    const boxes = async () =>
      Promise.all((await columns(page).all()).map(async (column) => column.boundingBox()));
    const [brand, nav, scores] = await boxes();
    expect(brand && nav && scores).toBeTruthy();
    if (!brand || !nav || !scores) return;
    expect(nav.y).toBeCloseTo(brand.y, 0);
    expect(scores.y).toBeCloseTo(brand.y, 0);
    expect(nav.x).toBeGreaterThanOrEqual(brand.x + brand.width);
    expect(scores.x).toBeGreaterThanOrEqual(nav.x + nav.width);

    await page.setViewportSize(narrow);
    const [brandNarrow, navNarrow, scoresNarrow] = await boxes();
    if (!brandNarrow || !navNarrow || !scoresNarrow) throw new Error("A column is not rendered");
    expect(navNarrow.x).toBeCloseTo(brandNarrow.x, 0);
    expect(scoresNarrow.x).toBeCloseTo(brandNarrow.x, 0);
    expect(navNarrow.y).toBeGreaterThanOrEqual(brandNarrow.y + brandNarrow.height);
    expect(scoresNarrow.y).toBeGreaterThanOrEqual(navNarrow.y + navNarrow.height);
    // Nothing overflows the phone's width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      narrow.width,
    );

    // The copyright line and the legal notice stay under the columns.
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(`© ${new Date().getFullYear()} Sekoya Solutions`);
    await expect(footer.getByRole("link", { name: t.legalNotice })).toHaveAttribute(
      "href",
      pathOf("legal", locale),
    );
  });
}

// The links sit in two columns, so the navigation is no taller than the
// measured scores: the footer keeps its height.
for (const [name, viewport] of Object.entries({ "1440 px": wide, "390 px": narrow })) {
  test(`the navigation's links sit in two columns at ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(pathOf("career", "fr"));
    const links = page.locator("footer .footer-navigation a");
    const lefts = await links.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBe(2);
    // Read down the first column, then the second.
    expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
    if (viewport === wide) {
      const height = (selector: string) =>
        page
          .locator(`footer ${selector}`)
          .evaluate((element) => element.getBoundingClientRect().height);
      expect(await height(".footer-navigation")).toBeLessThanOrEqual(
        await height(".footer-scores"),
      );
    }
  });
}

// Axe on the footer of every route, in both languages, at both widths and in
// both themes (the whole pages are checked in routes.spec.ts).
for (const [name, viewport] of Object.entries({ "1440 px": wide, "390 px": narrow })) {
  for (const theme of ["dark", "light"] as const) {
    test(`every footer has no accessibility violations at ${name} in the ${theme} theme`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((stored) => localStorage.setItem("theme", stored), theme);
      for (const key of Object.keys(routes) as RouteKey[]) {
        for (const locale of locales) {
          await page.goto(pathOf(key, locale));
          const results = await new AxeBuilder({ page })
            .include("footer")
            .withTags(wcagTags)
            .analyze();
          expect(results.violations, `${key} in ${locale}`).toEqual([]);
        }
      }
    });
  }
}
