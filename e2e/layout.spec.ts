import { expect, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf, type RouteKey, routes } from "../src/i18n/routes";

// The base layout (ADR 0003, ADR 0010): the font, the landmarks, the skip
// link, the focus ring, the icons and the width of the content.

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

// The page barely shifts through a real swap from a size-adjusted fallback
// to Outfit. Those fallbacks resize fonts installed on the visitor's machine
// (for system-ui: BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue or
// Arial), so one of them must be installed where the test runs; CI installs
// Roboto. Without one, the page starts in an unadjusted font and shifts.
// `size-adjust` matches the average width only, so a row of short labels
// aligned from the right or the centre (the header's navigation and its
// contact button, from 1280 px) still moves by a few pixels: the owner allows
// that, up to `maxFontSwapShift`, a hundredth of Google's 0.1 "good" limit
// for the whole page.
const maxFontSwapShift = 0.001;

test("swapping the fallback for the font barely shifts the layout", async ({ page }) => {
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
  // A local face that matched an installed font has loaded; the others
  // report an error.
  const fallbacksInUse = await page.evaluate(() =>
    [...document.fonts]
      .filter((font) => font.family.includes(" fallback: ") && font.status === "loaded")
      .map((font) => font.family),
  );
  expect(
    fallbacksInUse,
    "no size-adjusted fallback draws the page: install one of the fonts it resizes",
  ).not.toEqual([]);
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
  const total = shifts.reduce((sum, shift) => sum + shift, 0);
  expect(total, `layout shifts: ${shifts.join(", ")}`).toBeLessThanOrEqual(maxFontSwapShift);
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
    // The toggle comes right after the language switch.
    await page.getByRole("banner").getByRole("link", { name: "EN English" }).focus();
    await page.keyboard.press("Tab");
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

// ADR 0010: a page's content is never wider than the header's container, so
// every page lines up with the logo and the navigation. Only decorative
// elements (hidden from assistive technologies) may run to the screen's edges.
for (const key of Object.keys(routes) as RouteKey[]) {
  for (const locale of locales) {
    test(`${key} in ${locale}: the content stays within the header's edges`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "checked on a wide screen, where the container is narrower than it");
      await page.setViewportSize({ width: 1920, height: 950 });
      // Under reduced motion nothing slides in (global.css): the boxes are
      // measured where they rest, not part-way through their scroll reveal.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(pathOf(key, locale));
      // The content: every piece of text and every image, SVG or form field
      // a visitor sees. Boxes are not measured: a background or a band may run
      // to the screen's edges.
      const outside = await page.evaluate(() => {
        const header = document.querySelector("body > header");
        if (header === null) throw new Error("no header");
        const frame = header.getBoundingClientRect();
        const padding = getComputedStyle(header);
        const left = frame.left + Number.parseFloat(padding.paddingLeft) - 1;
        const right = frame.right - Number.parseFloat(padding.paddingRight) + 1;
        /** Seen: not hidden, decorative or inside a box clipped to a pixel (kept for screen readers). */
        const seen = (element: Element) => {
          if (element.closest('[aria-hidden="true"]') !== null) return false;
          if (getComputedStyle(element).visibility === "hidden") return false;
          for (let node: Element | null = element; node !== null; node = node.parentElement) {
            const box = node.getBoundingClientRect();
            if (box.width <= 1 || box.height <= 1) return false;
          }
          return true;
        };
        const main = document.querySelector("main");
        if (main === null) throw new Error("no main");
        const pieces: { label: string; boxes: DOMRect[] }[] = [];
        const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
          const parent = text.parentElement;
          if (parent === null || text.textContent?.trim() === "" || !seen(parent)) continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          pieces.push({
            label: `"${text.textContent?.trim().slice(0, 40)}"`,
            boxes: [...range.getClientRects()],
          });
        }
        for (const media of main.querySelectorAll(
          "img, svg, video, canvas, input, select, textarea",
        )) {
          if (media.parentElement?.closest("svg") || !seen(media)) continue;
          pieces.push({
            label: media.tagName.toLowerCase(),
            boxes: [media.getBoundingClientRect()],
          });
        }
        return pieces.flatMap(({ label, boxes }) =>
          boxes
            .filter((box) => box.width > 0 && (box.left < left || box.right > right))
            .map(
              (box) =>
                `${label}: ${Math.round(box.left)}–${Math.round(box.right)} (header ${Math.round(left)}–${Math.round(right)})`,
            ),
        );
      });
      expect(outside).toEqual([]);
    });
  }
}
