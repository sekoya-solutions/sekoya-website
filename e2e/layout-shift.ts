import { expect, type Page } from "@playwright/test";

// The one rule for layout shifts in the end-to-end tests (#64): every test
// that checks them records them here and checks their total against the same
// allowance. A unit test (scripts/layout-shift-rule.test.ts) fails on any
// test that observes layout shifts elsewhere.
//
// Why an allowance rather than none: the page is first drawn in a
// size-adjusted fallback font, swapped for Outfit once it arrives
// (ADR 0003). `size-adjust` matches the average width only, so a row of
// short labels aligned from the right or the centre (the header's navigation
// and its contact button, from 1280 px) still moves by a few pixels when the
// font arrives after the first paint, as it may on a slow or busy machine.
// The owner allows that, up to a hundredth of Google's 0.1 "good" limit for
// the whole page. Anything else that moves goes over it.

/** The total layout shift a page may have, from its first byte (owner). */
export const maxLayoutShift = 0.001;

/** What the recording keeps on the page's window. */
interface Recording {
  layoutShifts?: number[];
  layoutShiftObserver?: PerformanceObserver;
}

/** Records every layout shift from before the page's first byte; call before `goto`. */
export async function recordLayoutShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = window as Recording;
    state.layoutShifts = [];
    state.layoutShiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.layoutShifts?.push((entry as PerformanceEntry & { value: number }).value);
      }
    });
    state.layoutShiftObserver.observe({ type: "layout-shift" });
  });
}

/**
 * The layout shifts recorded so far, once the fonts are ready and two more
 * frames have been laid out and painted. Entries not yet delivered to the
 * observer's callback are taken too.
 */
export async function layoutShifts(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const state = window as Recording;
    if (state.layoutShifts === undefined) {
      throw new Error("Layout shifts are not recorded: call recordLayoutShifts before goto");
    }
    const pending = state.layoutShiftObserver?.takeRecords() ?? [];
    return [
      ...state.layoutShifts,
      ...pending.map((entry) => (entry as PerformanceEntry & { value: number }).value),
    ];
  });
}

/** Checks that the page's layout shifts so far stay within the allowance. */
export async function expectLayoutStable(page: Page): Promise<void> {
  const shifts = await layoutShifts(page);
  const total = shifts.reduce((sum, shift) => sum + shift, 0);
  expect(total, `layout shifts: ${shifts.join(", ") || "none"}`).toBeLessThanOrEqual(
    maxLayoutShift,
  );
}

/**
 * Holds the site's font back until `release` is called, so a test can let
 * the page paint with the fallback first and make the swap really happen on
 * screen, as on a slow connection.
 */
export async function holdFont(page: Page): Promise<() => void> {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/fonts/*.woff2", async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

/** Waits until the page has been painted at least once. */
export async function painted(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
