import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, type Page, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The career page (#18, #55): the trunk's rings from 1024 px with scripting,
// the vertical timeline below or without scripting, the semantic list always
// in the page, the drawing from the pith outwards once the rings come into
// view, the tooltip, the pinned panel, the legend and the keyboard, the fit at
// ADR 0010's reference sizes, reduced motion, and the page's JavaScript
// budget (ADR 0005).

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

/** How much of a ring's outer edge is drawn, from 0 to 1. */
async function drawn(page: Page, slug: string): Promise<number> {
  return page.locator(`.ring-lines[data-ring="${slug}"] .ring-outer`).evaluate((edge) => {
    // Serialised as a length, possibly in a calc(): `calc(0.5px)`.
    const offset = /-?\d*\.?\d+/.exec(getComputedStyle(edge).strokeDashoffset)?.[0];
    return 1 - Number(offset);
  });
}

/** The rings' drawing (a CSS animation), paused at `share` of its length, from 0 to 1. */
async function seekDrawing(page: Page, share: number) {
  await page.evaluate((value) => {
    const drawing = document
      .getAnimations()
      .find((animation) => (animation as CSSAnimation).animationName === "career-draw");
    if (drawing === undefined) throw new Error("no drawing");
    drawing.pause();
    drawing.currentTime = Number(drawing.effect?.getComputedTiming().duration) * value;
  }, share);
}

/** Resolves once the rings' drawing has finished. */
async function drawingDone(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => (animation as CSSAnimation).animationName === "career-draw")
        .map((animation) => animation.finished),
    ),
  );
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

test.describe("from 1024 px, with scripting", () => {
  test.skip(({ isMobile }) => isMobile, "the rings show from 1024 px");

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
    await drawingDone(page);
    const panel = page.locator("#career-panel");
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText("SOS Accessoire");
    await expect(panel).toContainText("3 ans 4 mois");
    await expect(panel.getByRole("link", { name: fr.labels.readCaseStudy })).toHaveAttribute(
      "href",
      pathOf("caseStudy/sos-accessoire", "fr"),
    );
    const band = page.locator('path[data-select="culligan"]');
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
    // The career reads from the pith outwards, in the legend too.
    expect(
      await page
        .locator(".legend [data-select]")
        .evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.select)),
    ).toEqual([...slugs].reverse());
  });

  test("pointing at a band lights it up and shows its tooltip there", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    await drawingDone(page);
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
    // Every position's dates are known: no band is flagged as a placeholder.
    await expect(page.locator("path[data-placeholder]")).toHaveCount(0);
  });

  test("a band clicked with the mouse shows no browser focus rectangle", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    await drawingDone(page);
    const band = page.locator('path[data-select="culligan"]');
    await band.click({ position: await bandPoint(page, "culligan") });
    await expect(band).toBeFocused();
    expect(await band.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  });

  test("how to read the rings shows with them, above the panel, once", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    // Written twice, shown once: only the copy with the rings is visible.
    const lead = page.getByText(typeset(fr.lead, "fr")).filter({ visible: true });
    await expect(lead).toHaveCount(1);
    await expect(page.locator(".stage-side .stage-lead")).toBeVisible();
  });
});

test.describe("the drawing, with motion", () => {
  test.skip(({ isMobile }) => isMobile, "the rings show from 1024 px");

  test("the rings draw from the pith outwards, once", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const oldest = slugs.at(-1) ?? "";
    const newest = slugs[0] ?? "";
    // The stage is in view on landing, so the drawing starts at once.
    await expect(page.locator("[data-career-stage]")).toHaveAttribute("data-draw", "run");
    await seekDrawing(page, 0);
    expect(await drawn(page, oldest)).toBeLessThan(0.05);
    expect(await drawn(page, newest)).toBeLessThan(0.05);
    // Part-way: the oldest ring is drawn, the newest not yet.
    await seekDrawing(page, 0.4);
    expect(await drawn(page, oldest)).toBeGreaterThan(0.95);
    expect(await drawn(page, newest)).toBeLessThan(0.05);
    await seekDrawing(page, 1);
    for (const slug of slugs) expect(await drawn(page, slug)).toBeGreaterThan(0.95);
    // Scrolled away and back, the rings stay drawn: the drawing never replays.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator("[data-career-stage]")).toHaveAttribute("data-draw", "run");
    for (const slug of slugs) expect(await drawn(page, slug)).toBeGreaterThan(0.95);
  });

  test("the rings wait undrawn until they come into view", async ({ page }) => {
    // The stage pushed below the screen as the page is parsed, before the
    // observer's first report, which then finds it out of view.
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        const head = document.querySelector<HTMLElement>(".career-head");
        if (head === null) return;
        head.style.marginBottom = "200vh";
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(pathOf("career", "fr"));
    await page.waitForLoadState("load");
    const stage = page.locator("[data-career-stage]");
    await expect(stage).toHaveAttribute("data-draw", "pending");
    for (const slug of slugs) expect(await drawn(page, slug)).toBe(0);
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute("data-draw", "run");
    await drawingDone(page);
    for (const slug of slugs) expect(await drawn(page, slug)).toBe(1);
  });

  test("a band's name appears as the band draws itself in, and the bark is smooth", async ({
    page,
  }) => {
    await page.goto(pathOf("career", "fr"));
    await expect(page.locator("[data-career-stage]")).toHaveAttribute("data-draw", "run");
    await seekDrawing(page, 0.15);
    const opacity = (slug: string) =>
      page
        .locator(`.ring-label[data-ring="${slug}"]`)
        .evaluate((label) => Number(getComputedStyle(label).opacity));
    expect(await opacity(slugs.at(-1) ?? "")).toBeGreaterThan(0.3);
    expect(await opacity("sos-accessoire")).toBe(0);
    await expect(page.locator(".bark")).not.toHaveAttribute("filter");
  });

  test("the page scrolls normally to its footer, with its usual spacing", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(pathOf("career", "fr"));
    // No scroll track: the stage is as tall as its content.
    const heights = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
      return { stage: box("[data-career-stage]")?.height, block: box(".stage-pin")?.height };
    });
    expect(heights.stage).toBe(heights.block);
    await expect(page.locator(".scroll-cue")).toHaveCount(0);
    const spacing = await page.evaluate(() => {
      const career = document.querySelector(".career-page");
      const footer = document.querySelector("footer");
      if (career === null || footer === null) throw new Error("no page or footer");
      return {
        padding: getComputedStyle(career).paddingBottom,
        margin: getComputedStyle(footer).marginTop,
      };
    });
    // The footer alone keeps the space before it.
    expect(spacing).toEqual({ padding: "0px", margin: "96px" });
  });
});

// ADR 0010's reference sizes from 1024 px: the ring and the side column side
// by side, the legend in one row under both, nothing overlapping or beyond
// the screen's sides, and the whole block, from the explanation to the
// legend, on one screen, whatever position the panel shows.
for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1280, height: 600 },
  { width: 1366, height: 650 },
  { width: 1440, height: 800 },
  { width: 1536, height: 730 },
  { width: 1600, height: 770 },
  { width: 1920, height: 950 },
]) {
  for (const locale of locales) {
    test(`at ${viewport.width} × ${viewport.height} in ${locale}, the rings, the panel and the legend fit on one screen`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "the rings show from 1024 px");
      await page.setViewportSize(viewport);
      await page.goto(pathOf("career", locale));
      for (const slug of slugs) {
        await page.locator(`.legend [data-select="${slug}"]`).click();
        const boxes = await page.evaluate(() => {
          const box = (selector: string) => {
            const element = document.querySelector(selector);
            if (element === null) throw new Error(`${selector} missing`);
            return element.getBoundingClientRect().toJSON() as DOMRect;
          };
          return {
            block: box(".stage-pin"),
            rings: box(".rings"),
            lead: box(".stage-lead"),
            side: box(".stage-side"),
            panel: box("#career-panel"),
            legend: box(".legend"),
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            height: innerHeight,
          };
        });
        expect(boxes.scrollWidth, "the page scrolls sideways").toBeLessThanOrEqual(boxes.width);
        expect(boxes.block.height, `${slug}: taller than the screen`).toBeLessThanOrEqual(
          boxes.height,
        );
        expect(boxes.rings.right).toBeLessThanOrEqual(boxes.panel.left);
        // The ring sits halfway down its row, beside the side column.
        const top = Math.min(boxes.rings.top, boxes.side.top);
        const bottom = Math.max(boxes.rings.bottom, boxes.side.bottom);
        expect(
          Math.abs((boxes.rings.top + boxes.rings.bottom) / 2 - (top + bottom) / 2),
          `${slug}: the ring is not centred`,
        ).toBeLessThan(2);
        expect(boxes.lead.bottom).toBeLessThanOrEqual(boxes.panel.top);
        expect(boxes.rings.bottom).toBeLessThanOrEqual(boxes.legend.top);
        expect(boxes.panel.bottom, `${slug}: the panel overlaps the legend`).toBeLessThanOrEqual(
          boxes.legend.top,
        );
        expect(boxes.panel.right).toBeLessThanOrEqual(boxes.width);
        expect(boxes.legend.right).toBeLessThanOrEqual(boxes.width);
      }
      const tops = await page
        .locator(".legend-item")
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
      expect(new Set(tops).size).toBe(1);
    });
  }
}

test.describe("under reduced motion", () => {
  test.skip(({ isMobile }) => isMobile, "the rings show from 1024 px");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the rings are drawn in full at once, with nothing running", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pathOf("career", "fr"));
    for (const slug of slugs) expect(await drawn(page, slug)).toBe(1);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    // Hover and pinning still work.
    await page.locator('path[data-select="atos-bull"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#career-panel").getByRole("heading", { level: 2 })).toHaveText(
      "Atos / Bull",
    );
  });
});

test.describe("below 1024 px", () => {
  test("the vertical timeline shows, and its cards open", async ({ page, isMobile }) => {
    // On the phone project, and on a desktop screen just under 1024 px.
    if (!isMobile) await page.setViewportSize({ width: 1023, height: 800 });
    await page.goto(pathOf("career", "fr"));
    // Nothing is wider than the screen: the page never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
    await expect(page.locator("[data-career-stage]")).toBeHidden();
    const list = page.getByRole("list", { name: fr.labels.list });
    await expect(list).toBeVisible();
    await expect(list.locator("summary").first()).not.toHaveAttribute("tabindex");
    // How to read the career stays under the title.
    await expect(page.locator(".career-head .head-lead")).toBeVisible();
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
  test.skip(isMobile, "the rings show from 1024 px");
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
