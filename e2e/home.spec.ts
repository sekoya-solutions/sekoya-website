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

test("the home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations).toEqual([]);
});
