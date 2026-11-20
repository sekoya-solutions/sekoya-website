import { expect, test } from "@playwright/test";

// The base layout (ADR 0003): the font, the landmarks, the skip link, the
// focus ring and the icons.

/** The load status of the Outfit face, the first family the body uses. */
function outfitStatus(): string | undefined {
  const unquote = (name: string) => name.trim().replace(/^"|"$/g, "");
  const first = unquote(getComputedStyle(document.body).fontFamily.split(",")[0]);
  return [...document.fonts].find((font) => unquote(font.family) === first)?.status;
}

test("the font is preloaded, swapped, and has size-adjusted fallbacks", async ({ page }) => {
  await page.goto("/");
  const preload = page.locator('link[rel="preload"][as="font"]');
  await expect(preload).toHaveCount(1);
  await expect(preload).toHaveAttribute("type", "font/woff2");
  await expect(preload).toHaveAttribute("crossorigin", "");
  const href = (await preload.getAttribute("href")) ?? "";
  expect(href).toMatch(/^\/_astro\/fonts\/[^/]+\.woff2$/);

  const faces = await page.evaluate(() =>
    [...document.styleSheets].flatMap((sheet) =>
      [...sheet.cssRules]
        .filter((rule) => rule instanceof CSSFontFaceRule)
        .map((rule) => ({
          family: rule.style.getPropertyValue("font-family"),
          src: rule.style.getPropertyValue("src"),
          display: rule.style.getPropertyValue("font-display"),
          sizeAdjust: rule.style.getPropertyValue("size-adjust"),
        })),
    ),
  );
  const outfit = faces.filter((face) => face.src.includes(href));
  expect(outfit).toHaveLength(1);
  expect(outfit[0].display).toBe("swap");
  const fallbacks = faces.filter((face) => face.src.startsWith("local("));
  expect(fallbacks.length).toBeGreaterThan(0);
  for (const fallback of fallbacks) expect(fallback.sizeAdjust).toMatch(/%$/);

  // The body uses Outfit first, then its size-adjusted fallbacks, and the
  // font loads.
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family.startsWith(outfit[0].family)).toBe(true);
  expect(family).toContain(fallbacks[0].family);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(outfitStatus)).toBe("loaded");
});

// The page shows no shift through a real swap. On this nearly empty page,
// nothing moves when text metrics change, so the size-adjusted fallbacks
// themselves are checked by the test above.
test("swapping the fallback for the font shifts no layout", async ({ page }) => {
  // Every layout shift, recorded from before the page's first byte.
  await page.addInitScript(() => {
    const state = window as { shifts?: number[]; shiftObserver?: PerformanceObserver };
    state.shifts = [];
    state.shiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        state.shifts?.push((entry as PerformanceEntry & { value: number }).value);
    });
    state.shiftObserver.observe({ type: "layout-shift" });
  });
  // The font is held back until the page has painted with the fallback, so
  // the swap really happens on screen.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/fonts/*.woff2", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Two frames: the page has been painted at least once, with the fallback.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.evaluate(outfitStatus)).toBe("loading");
  release();

  const shifts = await page.evaluate(async () => {
    await document.fonts.ready;
    // Two more frames, so the swap is laid out and painted.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const state = window as { shifts?: number[]; shiftObserver?: PerformanceObserver };
    // Entries not yet delivered to the callback are taken here.
    const pending = state.shiftObserver?.takeRecords() ?? [];
    return [
      ...(state.shifts ?? []),
      ...pending.map((entry) => (entry as PerformanceEntry & { value: number }).value),
    ];
  });
  expect(await page.evaluate(outfitStatus)).toBe("loaded");
  expect(shifts).toEqual([]);
});

test("the page has a header, a main region and a footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sekoya Solutions" }),
  ).toHaveAttribute("href", "/");
});

test("the skip link is the first stop and moves focus to the content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("keyboard focus shows a 2 px ring in the focus colour, in both themes", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Thème clair" });
  // Gold in the dark theme; in the light one, the dark green, since deep
  // gold is below 3:1 on sand.
  for (const colour of ["rgb(232, 211, 168)", "rgb(15, 107, 90)"]) {
    await page.locator("main").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS("outline-style", "solid");
    await expect(toggle).toHaveCSS("outline-width", "2px");
    await expect(toggle).toHaveCSS("outline-offset", "3px");
    await expect(toggle).toHaveCSS("outline-color", colour);
    await page.keyboard.press("Enter");
  }
});

test("the favicons and the web manifest are wired and served", async ({ page, request }) => {
  await page.goto("/");
  const links = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""));
  expect(links).toEqual([
    "/favicon.ico",
    "/favicon.svg",
    "/apple-touch-icon.png",
    "/site.webmanifest",
  ]);
  for (const link of links) expect((await request.get(link)).status(), link).toBe(200);

  const manifest = await (await request.get("/site.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Sekoya Solutions", background_color: "#0a1d24" });
  expect(manifest.icons).toHaveLength(2);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.status(), icon.src).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});
