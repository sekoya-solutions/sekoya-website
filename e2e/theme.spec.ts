import { expect, type Page, test } from "@playwright/test";

// ADR 0003: dark by default, a toggle stored in localStorage, and the stored
// theme set before the first paint.

const brand = {
  dark: { "--bg": "#0a1d24", "--mint": "#22c08a", "--gold": "#e8d3a8", "--grey": "#9dbdcc" },
  light: { "--bg": "#f6f1e8", "--mint": "#16927a", "--gold": "#a8893f", "--grey": "#4a6577" },
};

/** The brand tokens and the body's rendered colours, as computed by the browser. */
async function rendered(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      tokens: Object.fromEntries(
        ["--bg", "--mint", "--gold", "--grey"].map((name) => [name, root.getPropertyValue(name)]),
      ),
      background: body.backgroundColor,
      text: body.color,
    };
  });
}

const toggle = (page: Page) => page.getByRole("button", { name: "Thème clair" });

test("the dark theme is the default, with the exact brand values", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  expect(await rendered(page)).toEqual({
    tokens: brand.dark,
    background: "rgb(10, 29, 36)",
    text: "rgb(238, 244, 246)",
  });
});

test("the toggle switches to the light theme, with the exact brand values, and stores it", async ({
  page,
}) => {
  await page.goto("/");
  await toggle(page).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  expect(await rendered(page)).toEqual({
    tokens: brand.light,
    background: "rgb(246, 241, 232)",
    text: "rgb(14, 38, 47)",
  });
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("light");

  await toggle(page).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
});

test("a stored light theme is set before the body exists, so before the first paint", async ({
  page,
}) => {
  // Runs before any page script: records the theme at the moment the parser
  // inserts <body>. Nothing can paint the page's content before the body
  // exists, and the stylesheet after the script blocks rendering anyway.
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    const record = window as { themeAtBody?: string | null };
    new MutationObserver((_, observer) => {
      if (document.body === null) return;
      record.themeAtBody = document.documentElement.getAttribute("data-theme");
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  expect(await page.evaluate(() => (window as { themeAtBody?: string }).themeAtBody)).toBe("light");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
});

test("the theme script is a classic inline script before any stylesheet", async ({ page }) => {
  await page.goto("/");
  const head = await page.evaluate(() =>
    [...document.head.children].map((element) => ({
      // The structured data's JSON is a script element that is not run.
      script:
        element.tagName === "SCRIPT" && element.getAttribute("type") !== "application/ld+json",
      external: element.hasAttribute("src"),
      deferred: element.hasAttribute("async") || element.hasAttribute("defer"),
      type: element.getAttribute("type"),
      stylesheet: element.matches('link[rel="stylesheet"]'),
    })),
  );
  const script = head.findIndex((element) => element.script);
  expect(script).toBeGreaterThanOrEqual(0);
  expect(head[script]).toMatchObject({ external: false, deferred: false, type: null });
  expect(head.findIndex((element) => element.stylesheet)).toBeGreaterThan(script);
});

test("the toggle still switches the theme when storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage is disabled", "SecurityError");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await toggle(page).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the page is dark and the toggle, which would do nothing, is hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-theme-toggle]")).toBeHidden();
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(10, 29, 36)");
  });
});
