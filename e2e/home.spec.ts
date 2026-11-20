import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The accessibility target is WCAG 2.2 level AA, with zero axe violations.
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("the home page is served in French", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveTitle("Sekoya Solutions");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const theme of ["dark", "light"] as const) {
  test(`the home page has no accessibility violations in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((stored) => localStorage.setItem("theme", stored), theme);
    await page.goto("/");
    const html = page.locator("html");
    if (theme === "light") await expect(html).toHaveAttribute("data-theme", "light");
    else await expect(html).not.toHaveAttribute("data-theme");
    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(results.violations).toEqual([]);
  });
}
