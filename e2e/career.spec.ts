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
    // With no drawing on scroll, the panel does not follow it: it shows the initial position.
    await page.emulateMedia({ reducedMotion: "reduce" });
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
    // Every band drawn, so every band takes the focus.
    await scrollStage(page, 1);
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

  test("the panel follows the drawing, until the visitor pins a band", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const heading = page.locator("#career-panel").getByRole("heading", { level: 2 });
    const legend = page.locator(".legend [data-select]");
    // The career reads from the pith outwards, in the legend too.
    expect(await legend.evaluateAll((items) => items.map((item) => item.dataset.select))).toEqual(
      [...slugs].reverse(),
    );
    for (const [share, company] of [
      [0, "Atos / Bull"],
      [0.25, "Culligan"],
      [0.45, "SOS Accessoire"],
      [1, "Sekoya Solutions"],
    ] as const) {
      await scrollStage(page, share);
      await expect(heading).toHaveText(company);
    }
    await page.locator('.legend [data-select="culligan"]').click();
    await scrollStage(page, 0.45);
    await expect(page.locator('[data-ring="sos-accessoire"].ring-lines')).not.toHaveClass(/pinned/);
    await expect(heading).toHaveText("Culligan");
  });

  test("on landing, a big arrow at the bottom of the screen says the page scrolls on", async ({
    page,
  }) => {
    await page.goto(pathOf("career", "fr"));
    const cue = page.locator(".scroll-cue");
    await expect(cue).toBeVisible();
    await expect(cue).toHaveText(typeset(fr.labels.scrollHint, "fr"));
    await expect(cue).toBeInViewport();
    // The arrow is big: 60 px, in gold.
    const arrow = await cue.locator(".scroll-cue-arrow").boundingBox();
    expect(arrow?.width).toBeGreaterThanOrEqual(56);
    // It goes once the visitor scrolls.
    await page.evaluate(() => scrollTo(0, innerHeight * 0.5));
    await expect(cue).toBeHidden();
  });

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1600, height: 1000 },
    { width: 1600, height: 1200 },
    { width: 1920, height: 1200 },
  ]) {
    test(`at ${viewport.width} × ${viewport.height}, the arrow sits above the legend's cards, never over them`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(pathOf("career", "fr"));
      const cue = await page.locator(".scroll-cue").boundingBox();
      const legend = await page.locator(".legend").boundingBox();
      if (cue === null || legend === null) throw new Error("cue or legend missing");
      expect(cue.y + cue.height).toBeLessThanOrEqual(viewport.height);
      expect(cue.y + cue.height).toBeLessThanOrEqual(legend.y - 8);
    });
  }

  test("how to read the rings shows with them, above the panel, once", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    // Written twice, shown once: only the copy with the rings is visible.
    const lead = page.getByText(typeset(fr.lead, "fr")).filter({ visible: true });
    await expect(lead).toHaveCount(1);
    await expect(page.locator(".stage-side .stage-lead")).toBeVisible();
    await scrollStage(page, 0.5);
    await expect(page.locator(".stage-lead")).toBeInViewport();
  });

  test("a band not drawn yet takes neither the pointer nor the focus", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    const band = page.locator('path[data-select="culligan"]');
    await expect(band).toHaveAttribute("data-undrawn", "");
    await expect(band).toHaveAttribute("tabindex", "-1");
    expect(await band.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
    // Once the drawing reaches it, it does.
    await scrollStage(page, 0.3);
    await expect(band).not.toHaveAttribute("data-undrawn");
    await expect(band).toHaveAttribute("tabindex", "0");
  });

  test("a legend card whose ring is not drawn scrolls to it, then pins it", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    await page.locator('.legend [data-select="sos-accessoire"]').click();
    await expect.poll(() => drawn(page, "sos-accessoire")).toBeGreaterThan(0.95);
    await expect(page.locator("#career-panel").getByRole("heading", { level: 2 })).toHaveText(
      "SOS Accessoire",
    );
  });

  test("a pinned ring scrolled back to undrawn is released, and the panel follows again", async ({
    page,
  }) => {
    await page.goto(pathOf("career", "fr"));
    await scrollStage(page, 1);
    const card = page.locator('.legend [data-select="sos-accessoire"]');
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    // Back above SOS Accessoire's ring, which starts drawing at 40 %.
    await scrollStage(page, 0.25);
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#career-panel").getByRole("heading", { level: 2 })).toHaveText(
      "Culligan",
    );
  });

  test("a band clicked with the mouse shows no browser focus rectangle", async ({ page }) => {
    await page.goto(pathOf("career", "fr"));
    await scrollStage(page, 1);
    const band = page.locator('path[data-select="culligan"]');
    await band.click({ position: await bandPoint(page, "culligan") });
    await expect(band).toBeFocused();
    expect(await band.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  });

  test("on landing, the panel shows the oldest position, where the drawing starts", async ({
    page,
  }) => {
    await page.goto(pathOf("career", "fr"));
    await expect(page.locator("#career-panel").getByRole("heading", { level: 2 })).toHaveText(
      "Atos / Bull",
    );
  });

  test("no empty screen shows before or after the pinned block", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(pathOf("career", "fr"));
    const page_ = (selector: string, edge: "top" | "bottom") =>
      page.evaluate(
        ([query, side]) =>
          (document.querySelector(query)?.getBoundingClientRect()[side as "top" | "bottom"] ?? 0) +
          scrollY,
        [selector, edge],
      );
    // As the visitor lands: the pinned block follows the page's title.
    expect(
      (await page_(".stage-pin", "top")) - (await page_(".career-head", "bottom")),
    ).toBeLessThan(80);
    // At the track's end, the block leaves with it, and the footer follows.
    await scrollStage(page, 1);
    await page.evaluate(() => scrollBy(0, 200));
    expect(
      Math.abs((await page_(".stage", "bottom")) - (await page_(".stage-pin", "bottom"))),
    ).toBeLessThan(2);
    // Then the footer, directly: no page padding or footer margin between
    // them, so no empty band under the legend (#51).
    expect(
      Math.abs((await page_("footer", "top")) - (await page_(".stage-pin", "bottom"))),
    ).toBeLessThan(2);
  });

  // The pinned block is about as tall as the screen, so it leaves it as the
  // footer comes up (the owner's choice, #51), but only by the footer's
  // height: the page cannot scroll past the block any further.
  for (const viewport of [
    { width: 1280, height: 640 },
    { width: 1440, height: 900 },
    { width: 1600, height: 915 },
    { width: 1920, height: 1080 },
  ]) {
    test(`at the bottom of the page, the block has moved up by the footer's height only (${viewport.width} × ${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(pathOf("career", "fr"));
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const { pinBottom, footerTop, footerHeight, pageBottom } = await page.evaluate(() => {
        const footer = document.querySelector("footer");
        const pin = document.querySelector(".stage-pin");
        if (footer === null || pin === null) throw new Error("no footer or pinned block");
        return {
          pinBottom: pin.getBoundingClientRect().bottom,
          footerTop: footer.getBoundingClientRect().top,
          footerHeight: footer.getBoundingClientRect().height,
          pageBottom: document.documentElement.scrollHeight - scrollY,
        };
      });
      // The page is scrolled to its very end, the footer's bottom at the
      // screen's bottom.
      expect(Math.abs(pageBottom - viewport.height)).toBeLessThan(2);
      expect(Math.abs(footerTop + footerHeight - viewport.height)).toBeLessThan(2);
      // The block ends where the footer starts: above it, only the footer's
      // height of the screen is taken from the block.
      expect(Math.abs(pinBottom - footerTop)).toBeLessThan(2);
      expect(pinBottom).toBeGreaterThanOrEqual(viewport.height - footerHeight - 1);
    });
  }

  test("without the pinned block, the page keeps its spacing before the footer", async ({
    page,
  }) => {
    // From 1024 px the rings show, but are only pinned from 1280 × 640.
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(pathOf("career", "fr"));
    const spacing = await page.evaluate(() => {
      const career = document.querySelector(".career-page");
      const footer = document.querySelector("footer");
      if (career === null || footer === null) throw new Error("no page or footer");
      return {
        padding: getComputedStyle(career).paddingBottom,
        margin: getComputedStyle(footer).marginTop,
      };
    });
    expect(spacing).toEqual({ padding: "96px", margin: "96px" });
    // Another page keeps the footer's margin at the pinned size.
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(pathOf("legal", "fr"));
    expect(
      await page.locator("footer").evaluate((footer) => getComputedStyle(footer).marginTop),
    ).toBe("96px");
  });

  test("a band's name appears as the band draws itself in, and the bark is smooth", async ({
    page,
  }) => {
    await page.goto(pathOf("career", "fr"));
    await scrollStage(page, 0.15);
    const opacity = (slug: string) =>
      page
        .locator(`.ring-label[data-ring="${slug}"]`)
        .evaluate((label) => Number(getComputedStyle(label).opacity));
    await expect.poll(() => opacity("atos-bull")).toBeGreaterThan(0.3);
    await expect.poll(() => opacity("sos-accessoire")).toBe(0);
    await expect(page.locator(".bark")).not.toHaveAttribute("filter");
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
            lead: box(".stage-lead"),
            width: document.documentElement.clientWidth,
            height: innerHeight,
          };
        });
        expect(boxes.rings.top).toBeGreaterThanOrEqual(0);
        // How to read the rings stays in view with them, above the panel.
        expect(boxes.lead.top).toBeGreaterThanOrEqual(0);
        expect(boxes.lead.bottom).toBeLessThanOrEqual(boxes.panel.top);
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
    await expect(page.locator(".scroll-cue")).toBeHidden();
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
