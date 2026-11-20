import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { languages, locales } from "../src/i18n/config";
import { pathOf, type RouteKey, routes } from "../src/i18n/routes";

// Every route of src/i18n/routes.ts, in both languages (ADR 0004): the page
// exists, declares its language and its alternates, its language switch lands
// on the equivalent page, and it has no accessibility violations.

// The accessibility target is WCAG 2.2 level AA, with zero axe violations.
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const site = "https://sekoyasolutions.com";

for (const key of Object.keys(routes) as RouteKey[]) {
  for (const locale of locales) {
    const path = pathOf(key, locale);

    test.describe(`${key} in ${locale} (${path})`, () => {
      test("is served in its language, with its hreflang alternates", async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const links = await page
          .locator('head link[rel="alternate"][hreflang]')
          .evaluateAll((elements) =>
            elements.map((element) => [
              element.getAttribute("hreflang"),
              element.getAttribute("href"),
            ]),
          );
        expect(links).toEqual([
          ...locales.map((other) => [other, `${site}${pathOf(key, other)}`]),
          ["x-default", `${site}${pathOf(key, "fr")}`],
        ]);
      });

      for (const other of locales.filter((candidate) => candidate !== locale)) {
        test(`its language switch lands on the ${other} page`, async ({ page }) => {
          await page.goto(path);
          const header = page.getByRole("banner");
          const name = (language: (typeof locales)[number]) =>
            `${languages[language].code} ${languages[language].name}`;
          // The current language is shown but is not a link.
          await expect(header.getByText(languages[locale].code, { exact: true })).toBeVisible();
          await expect(header.getByRole("link", { name: name(locale), exact: true })).toHaveCount(
            0,
          );

          // The link is named by its visible code, then the language's name.
          const link = header.getByRole("link", { name: name(other), exact: true });
          await expect(link.getByText(languages[other].code, { exact: true })).toBeVisible();
          await expect(link).toHaveAttribute("hreflang", other);
          await expect(link).toHaveAttribute("lang", other);
          await link.click();
          await expect(page).toHaveURL(pathOf(key, other));
          await expect(page.locator("html")).toHaveAttribute("lang", other);
        });
      }

      for (const theme of ["dark", "light"] as const) {
        test(`has no accessibility violations in the ${theme} theme`, async ({ page }) => {
          await page.addInitScript((stored) => localStorage.setItem("theme", stored), theme);
          await page.goto(path);
          const html = page.locator("html");
          if (theme === "light") await expect(html).toHaveAttribute("data-theme", "light");
          else await expect(html).not.toHaveAttribute("data-theme");
          const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
          expect(results.violations).toEqual([]);
        });
      }
    });
  }
}

test("the header's logo links to the home page in the page's language", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(pathOf("home", locale));
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Sekoya Solutions" }),
    ).toHaveAttribute("href", pathOf("home", locale));
  }
});

test("the interface strings follow the page's language", async ({ page }) => {
  await page.goto(pathOf("home", "en"));
  await expect(page.getByRole("button", { name: "Light theme" })).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});
