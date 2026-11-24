import { expect, type Page, test } from "@playwright/test";
import { featureTestPort } from "../scripts/feature-test";
import { locales } from "../src/i18n/config";
import { pathOf, type RouteKey, routes, testimonialsPaths } from "../src/i18n/routes";

// The width sweep (ADR 0010): every page, in French and English, widened step
// by step from 320 to 1920 px, with each width step's value and the pixel
// below it, at the 600 px height and the tallest one, then at each of ADR
// 0010's reference viewport sizes. At every size, once a
// frame has been drawn after the resize: no horizontal scroll, no visible
// element beyond the viewport's sides outside a box that clips it, no text
// clipped by a box that hides its overflow, and no overlap between the regions
// a page marks as side by side (`data-region`, grouped by its value). Run as
// its own Playwright project, `sweep` (playwright.config.ts), in its own CI job.
// The pages only the feature test build has, the testimonials and the home
// page with their section (#23), are swept there.

/** The width step between two checked widths, in CSS pixels. */
const step = 16;
/** The heights every width is checked at. */
const heights = [600, 950];
/** ADR 0010's width steps (48, 64 and 80 rem) and the pixel below each. */
const edges = [767, 768, 1023, 1024, 1279, 1280];
/** ADR 0010's reference sizes, as the browser's viewport. */
const references = [
  [320, 568],
  [360, 740],
  [390, 664],
  [768, 1024],
  [1024, 768],
  [1280, 600],
  [1366, 650],
  [1440, 800],
  [1536, 730],
  [1600, 770],
  [1920, 950],
] as const;

const widths = [
  ...new Set([
    ...Array.from({ length: (1920 - 320) / step + 1 }, (_, i) => 320 + i * step),
    ...edges,
  ]),
].sort((a, b) => a - b);

/** The layout problems at the current size, as readable lines. */
function problemsNow(): string[] {
  const problems: string[] = [];
  const root = document.documentElement;
  const viewport = root.clientWidth;
  if (root.scrollWidth > viewport)
    problems.push(`the page scrolls sideways (${root.scrollWidth} px)`);

  const name = (element: Element) =>
    `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${
      typeof element.className === "string" && element.className.trim() !== ""
        ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : ""
    }`;
  const style = (element: Element) => getComputedStyle(element);
  const hides = (value: string) => value === "hidden" || value === "clip";

  // Whether a box between the element and the page clips it sideways, or
  // scrolls: content beyond the viewport there is the box's own business.
  const clippedMemo = new Map<Element, boolean>();
  const clipped = (element: Element | null): boolean => {
    if (element === null || element === document.body || element === root) return false;
    const known = clippedMemo.get(element);
    if (known !== undefined) return known;
    const own = style(element).overflowX !== "visible";
    const result = own || clipped(element.parentElement);
    clippedMemo.set(element, result);
    return result;
  };

  for (const element of document.body.querySelectorAll("*")) {
    if (!element.checkVisibility({ visibilityProperty: true, opacityProperty: false })) continue;
    const box = element.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1) continue;
    const position = style(element).position;
    if (
      (box.left < -1 || box.right > viewport + 1) &&
      position !== "fixed" &&
      !clipped(element.parentElement)
    ) {
      problems.push(
        `${name(element)} runs past the sides (${Math.round(box.left)} to ${Math.round(box.right)})`,
      );
    }
  }

  // Clipped text: a piece of text that runs past a box hiding its overflow.
  // Text hidden on purpose (decorative, or visually hidden for screen readers
  // with `clip-path: inset(50%)`) is left out; so are boxes, whose own
  // decoration may be clipped by design.
  const visuallyHidden = (element: Element) => {
    for (let node: Element | null = element; node !== null; node = node.parentElement) {
      if (style(node).clipPath === "inset(50%)") return true;
    }
    return false;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
    const parent = text.parentElement;
    if (parent === null || (text.textContent ?? "").trim() === "") continue;
    if (!parent.checkVisibility({ visibilityProperty: true })) continue;
    if (parent.closest('[aria-hidden="true"]') !== null || visuallyHidden(parent)) continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    const pieces = [...range.getClientRects()].filter((piece) => piece.width > 0);
    for (let box: Element | null = parent; box !== null && box !== root; box = box.parentElement) {
      const own = style(box);
      const x = hides(own.overflowX);
      const y = hides(own.overflowY);
      if (!x && !y) continue;
      const edge = box.getBoundingClientRect();
      const out = pieces.some(
        (piece) =>
          (x && (piece.left < edge.left - 1 || piece.right > edge.right + 1)) ||
          (y && (piece.top < edge.top - 1 || piece.bottom > edge.bottom + 1)),
      );
      if (out) {
        problems.push(
          `${name(box)} clips the text "${(text.textContent ?? "").trim().slice(0, 30)}"`,
        );
        break;
      }
    }
  }

  const groups = new Map<string, Element[]>();
  for (const region of document.querySelectorAll("[data-region]")) {
    if (!region.checkVisibility()) continue;
    const group = region.getAttribute("data-region") ?? "";
    groups.set(group, [...(groups.get(group) ?? []), region]);
  }
  for (const [group, regions] of groups) {
    regions.forEach((first, index) => {
      for (const second of regions.slice(index + 1)) {
        const a = first.getBoundingClientRect();
        const b = second.getBoundingClientRect();
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 1 && height > 1) {
          problems.push(`${name(first)} and ${name(second)} overlap (${group})`);
        }
      }
    });
  }
  return problems;
}

/** Resolves once a frame has been drawn at the current size. */
async function settled(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

test.describe.configure({ mode: "parallel" });

const feature = `http://localhost:${featureTestPort}`;
const pages = [
  ...(Object.keys(routes) as RouteKey[]).flatMap((key) =>
    locales.map((locale) => ({ name: `${key} in ${locale}`, url: pathOf(key, locale) })),
  ),
  ...locales.flatMap((locale) => [
    { name: `home with testimonials in ${locale}`, url: `${feature}${pathOf("home", locale)}` },
    { name: `testimonials in ${locale}`, url: `${feature}${testimonialsPaths[locale]}` },
  ]),
];

for (const { name, url } of pages) {
  test(name, async ({ page }) => {
    test.setTimeout(180_000);
    // At rest: under reduced motion nothing slides or fades in (global.css).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: widths[0] ?? 320, height: heights[0] ?? 600 });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    const found = new Map<string, string[]>();
    const sizes = [
      ...heights.flatMap((height) => widths.map((width) => [width, height] as const)),
      ...references,
    ];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await settled(page);
      for (const problem of await page.evaluate(problemsNow)) {
        const kind = problem.replace(/\(.*\)$/, "").trim();
        found.set(kind, [...(found.get(kind) ?? []), `${width}×${height}`]);
      }
    }
    // One line per problem, with the sizes where it shows.
    const report = [...found].map(([problem, sizes]) =>
      sizes.length > 6
        ? `${problem}: ${sizes.length} sizes, ${sizes.slice(0, 3).join(", ")} … ${sizes.slice(-2).join(", ")}`
        : `${problem}: ${sizes.join(", ")}`,
    );
    expect(report).toEqual([]);
  });
}
