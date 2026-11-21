import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, type Page, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The career page (#18): the trunk's rings from 768 px with scripting, the
// vertical timeline below or without scripting, the semantic list always in
// the page, the drawing from the pith outwards on scroll, the tooltip, the
// pinned panel, the legend and the keyboard, reduced motion, and the page's
// JavaScript budget (ADR 0005).

/** The career copy of a language, as the content file writes it. */
function careerCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/career/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

const fr = careerCopy("fr");
const slugs: string[] = fr.positions.map((position: { slug: string }) => position.slug);

/** The rings' stage scrolled so that the drawing's progress is `share`, from 0 to 1. */
async function scrollStage(page: Page, share: number) {
  await page.evaluate((value) => {
    const stage = document.querySelector<HTMLElement>("[data-career-stage]");
    if (stage === null) throw new Error("no stage");
    const top = stage.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + (stage.offsetHeight - innerHeight) * value);
  }, share);
}

/** How much of a ring's outer edge is drawn, from 0 to 1. */
async function drawn(page: Page, slug: string): Promise<number> {
  return page.locator(`.ring-lines[data-ring="${slug}"] .ring-outer`).evaluate((edge) => {
    // Serialised as a length, possibly in a calc(): `calc(0.5px)`.
    const offset = /-?\d*\.?\d+/.exec(getComputedStyle(edge).strokeDashoffset)?.[0];
    return 1 - Number(offset);
  });
}

for (const locale of locales) {
  test(`the career page shows its copy and every position in ${locale}`, async ({ page }) => {
    const copy = careerCopy(locale);
    await page.goto(pathOf("career", locale));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toContainText(
      typeset(copy.title, locale).replace(/\[TODO:[^\]]*\]\s*/, ""),
    );
    // The semantic list, the most recent position first, is always in the page.
    const list = main.getByRole("list", { name: typeset(copy.labels.list, locale) });
    await expect(list.locator(":scope > li")).toHaveCount(copy.positions.length);
    await expect(list.locator(".timeline-company")).toHaveText(
      copy.positions.map((position: { company: string }) => position.company),
    );
  });
}

test.describe("from 768 px, with scripting", () => {
  test.skip(({ isMobile }) => isMobile, "the rings show from 768 px");

  test("the rings show, and the list is kept for screen readers only", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const rings = page.getByRole("group", { name: typeset(fr.labels.rings, "fr") });
    await expect(rings).toBeVisible();
    await expect(rings.getByRole("button")).toHaveCount(slugs.length);
    const list = page.getByRole("list", { name: fr.labels.list });
    await expect(list).toBeAttached();
    expect(await list.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThan(2);
    // Its summaries leave the Tab order, so the focus never lands on them unseen.
    for (const summary of await list.locator("summary").all()) {
      await expect(summary).toHaveAttribute("tabindex", "-1");
    }
  });

  test("the panel shows the initial position, and a click pins another", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const panel = page.locator("#career-panel");
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText("SOS Accessoire");
    await expect(panel).toContainText("3 ans 4 mois");
    await expect(panel.getByRole("link", { name: fr.labels.readCaseStudy })).toHaveAttribute(
      "href",
      pathOf("caseStudy/sos-accessoire", "fr"),
    );
    const band = page.locator('path[data-select="culligan"]');
    await scrollStage(page, 1);
    await band.click({ position: await bandPoint(page, "culligan") });
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Culligan");
    await expect(band).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('path[data-select="sos-accessoire"]')).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // The legend pins too, and says which one is pinned.
    const legend = page.getByRole("list", { name: fr.labels.legend });
    await legend.getByRole("button", { name: /Atos \/ Bull/ }).click();
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Atos / Bull");
    await expect(legend.getByRole("button", { name: /Atos \/ Bull/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("pointing at a band lights it up and shows its tooltip there", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    await scrollStage(page, 1);
    const point = await bandPoint(page, "culligan");
    const band = page.locator('path[data-select="culligan"]');
    const box = await band.boundingBox();
    if (box === null) throw new Error("no band");
    await page.mouse.move(box.x + point.x, box.y + point.y);
    const tip = page.locator('[data-tip="culligan"]');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Culligan");
    await expect(page.locator('.ring-lines[data-ring="culligan"]')).toHaveClass(/\bhot\b/);
    // The tooltip's arrow points at the band, next to the pointer.
    const tipBox = await tip.boundingBox();
    if (tipBox === null) throw new Error("no tooltip");
    expect(Math.abs(tipBox.x + tipBox.width / 2 - (box.x + point.x))).toBeLessThan(40);
    expect(box.y + point.y - (tipBox.y + tipBox.height)).toBeGreaterThan(0);
    expect(box.y + point.y - (tipBox.y + tipBox.height)).toBeLessThan(60);
    // Escape hides it without moving the pointer.
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
  });

  test("the keyboard moves between the bands and pins one", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const band = (slug: string) => page.locator(`path[data-select="${slug}"]`);
    await band("sos-accessoire").focus();
    await expect(page.locator('[data-tip="sos-accessoire"]')).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(band("culligan")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(band("atos-bull")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowRight");
    await expect(band("sos-accessoire")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(band("sekoya-solutions")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#career-panel").getByRole("heading", { level: 2 })).toHaveText(
      "Sekoya Solutions",
    );
    await band("culligan").focus();
    await page.keyboard.press(" ");
    await expect(band("culligan")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-tip="culligan"]')).toBeHidden();
  });

  test("each band is named by its company, role and period", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    await expect(page.locator('path[data-select="sos-accessoire"]')).toHaveAttribute(
      "aria-label",
      "SOS Accessoire, Lead Dev, de 05/2022 à 09/2025",
    );
    // A position whose dates are placeholders is flagged.
    await expect(page.locator('path[data-select="culligan"]')).toHaveAttribute(
      "data-placeholder",
      "",
    );
  });
});

test.describe("from 1280 px wide and 640 px tall, with motion", () => {
  test.skip(({ isMobile }) => isMobile, "the rings draw on scroll on a large screen");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the rings draw from the pith outwards as the page scrolls", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const [oldest, , , newest] = [...slugs].reverse() as [string, string, string, string];
    await scrollStage(page, 0);
    await expect.poll(() => drawn(page, oldest)).toBeLessThan(0.05);
    await expect.poll(() => drawn(page, newest)).toBeLessThan(0.05);
    // Part-way: the oldest ring is drawn, the newest not yet.
    await scrollStage(page, 0.4);
    await expect.poll(() => drawn(page, oldest)).toBeGreaterThan(0.95);
    await expect.poll(() => drawn(page, newest)).toBeLessThan(0.05);
    await scrollStage(page, 1);
    for (const slug of slugs) await expect.poll(() => drawn(page, slug)).toBeGreaterThan(0.95);
    // The rings and the panel stay in view while the track scrolls by.
    await expect(page.locator(".rings")).toBeInViewport();
    await expect(page.locator("#career-panel")).toBeInViewport();
  });

  for (const viewport of [
    { width: 1280, height: 640 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    test(`at ${viewport.width} × ${viewport.height}, the pinned block fits the screen, whatever position the panel shows`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(pathOf("career", "fr"));
      await scrollStage(page, 0.5);
      for (const slug of slugs) {
        await page.locator(`.legend [data-select="${slug}"]`).click();
        const boxes = await page.evaluate(() => {
          const box = (selector: string) => {
            const element = document.querySelector(selector);
            if (element === null) throw new Error(`${selector} missing`);
            return element.getBoundingClientRect();
          };
          return {
            rings: box(".rings"),
            panel: box("#career-panel"),
            legend: box(".legend"),
            width: document.documentElement.clientWidth,
            height: innerHeight,
          };
        });
        expect(boxes.rings.top).toBeGreaterThanOrEqual(0);
        expect(boxes.rings.bottom).toBeLessThanOrEqual(boxes.legend.top);
        expect(boxes.panel.bottom, `${slug}: the panel overlaps the legend`).toBeLessThanOrEqual(
          boxes.legend.top,
        );
        expect(boxes.legend.bottom).toBeLessThanOrEqual(boxes.height);
        expect(boxes.panel.right).toBeLessThanOrEqual(boxes.width);
      }
    });
  }
});

test.describe("from 1024 px, on a smaller screen", () => {
  test.skip(({ isMobile }) => isMobile, "the rings show from 768 px");
  test.use({ viewport: { width: 1100, height: 800 } });

  test("the rings are drawn in full beside the panel, with the legend in one row", async ({
    page,
  }) => {
    await page.goto(pathOf("career", "fr"));
    for (const slug of slugs) expect(await drawn(page, slug)).toBe(1);
    const stage = page.locator("[data-career-stage]");
    expect(await stage.evaluate((element: HTMLElement) => element.offsetHeight)).toBeLessThan(
      800 * 1.5,
    );
    const tops = await page
      .locator(".legend-item")
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
  });
});

test.describe("under reduced motion", () => {
  test.skip(({ isMobile }) => isMobile, "the rings show from 768 px");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the rings are drawn in full, with no scroll track and nothing running", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pathOf("career", "fr"));
    for (const slug of slugs) expect(await drawn(page, slug)).toBe(1);
    const stage = page.locator("[data-career-stage]");
    expect(await stage.evaluate((element: HTMLElement) => element.offsetHeight)).toBeLessThan(
      900 * 1.5,
    );
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    // Hover and pinning still work.
    await page.locator('path[data-select="atos-bull"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#career-panel").getByRole("heading", { level: 2 })).toHaveText(
      "Atos / Bull",
    );
  });
});

test.describe("below 768 px", () => {
  test.skip(({ isMobile }) => !isMobile, "the timeline shows below 768 px");

  test("the vertical timeline shows, and its cards open", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    // Nothing is wider than the phone: the page never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
    await expect(page.locator("[data-career-stage]")).toBeHidden();
    const list = page.getByRole("list", { name: fr.labels.list });
    await expect(list).toBeVisible();
    const card = list.locator("details").nth(1);
    await expect(card.locator(".highlights")).toBeHidden();
    await card.locator("summary").click();
    await expect(card.locator(".highlights")).toBeVisible();
    await expect(card.getByRole("link", { name: fr.labels.readCaseStudy })).toBeVisible();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the vertical timeline shows instead of the rings", async ({ page }) => {
    await page.goto(pathOf("career", "en"));
    await expect(page.locator("[data-career-stage]")).toBeHidden();
    await expect(page.getByRole("list", { name: careerCopy("en").labels.list })).toBeVisible();
    await expect(page.locator(".timeline summary").first()).not.toHaveAttribute("tabindex");
  });
});

test("the light theme draws the trunk in light wood, with no dark disc", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the rings show from 768 px");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto(pathOf("career", "fr"));
  const lightness = await page.locator('path[data-select="sos-accessoire"]').evaluate((band) => {
    const canvas = document.createElement("canvas").getContext("2d");
    if (canvas === null) throw new Error("no canvas");
    canvas.fillStyle = getComputedStyle(band).fill;
    canvas.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = canvas.getImageData(0, 0, 1, 1).data;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  expect(lightness).toBeGreaterThan(0.75);
});

test("the page's JavaScript stays within 3 KB compressed", async ({ request }) => {
  const html = await (await request.get(pathOf("career", "fr"))).text();
  let total = 0;
  for (const [, attributes = "", body = ""] of html.matchAll(
    /<script([^>]*)>([\s\S]*?)<\/script>/g,
  )) {
    const source = /\bsrc="([^"]+)"/.exec(attributes)?.[1];
    const code = source === undefined ? body : await (await request.get(source)).text();
    total += gzipSync(code).length;
  }
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(3 * 1024);
});

/** A point inside a band, relative to the band's bounding box: on its top-right arc. */
async function bandPoint(page: Page, slug: string): Promise<{ x: number; y: number }> {
  return page.locator(`path[data-select="${slug}"]`).evaluate((band: SVGPathElement) => {
    const svg = band.ownerSVGElement;
    if (svg === null) throw new Error("no svg");
    const box = svg.getBoundingClientRect();
    const own = band.getBoundingClientRect();
    const radius = (Number(band.dataset.r) / 800) * box.width;
    const angle = (55 * Math.PI) / 180;
    return {
      x: box.left + box.width / 2 + radius * Math.sin(angle) - own.left,
      y: box.top + box.height / 2 - radius * Math.cos(angle) - own.top,
    };
  });
}
