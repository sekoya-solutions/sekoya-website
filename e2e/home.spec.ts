import { expect, test } from "@playwright/test";

// Every route's language, alternates and accessibility, the home page's
// included, are checked by e2e/routes.spec.ts.

test("the home page is served in French", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveTitle("Sekoya Solutions");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the English home page is served under /en", async ({ page }) => {
  const response = await page.goto("/en");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
