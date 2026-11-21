import { expect, type Page, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The home hero (#9): the logo's growth timeline, the copy's reveal, reduced
// motion, the Largest Contentful Paint (LCP) element and layout stability.
// The expected timings are the brief's animation table, in milliseconds,
// written out here rather than read from the code, so a changed timing fails.

const tolerance = 50;

/** One animation of the hero as the browser runs it. */
interface Running {
  name: string;
  target: string;
  delay: number;
  duration: number;
  iterations: number;
  direction: string;
}

/** Every animation of the hero, with its target's classes; the sections below have their own (home-sections.spec.ts). */
function runningAnimations(page: Page): Promise<Running[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest(".hero"))
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const timing = effect.getComputedTiming();
        return {
          name: (animation as CSSAnimation).animationName,
          target: effect.target?.getAttribute("class") ?? "",
          delay: Number(timing.delay),
          duration: Number(timing.duration),
          iterations: Number(timing.iterations),
          direction: String(timing.direction),
        };
      }),
  );
}

function having(animations: Running[], targetClass: string): Running[] {
  return animations.filter(({ target }) => target.split(" ").includes(targetClass));
}

function expectNear(actual: number, expected: number, label: string) {
  expect(Math.abs(actual - expected), `${label}: ${actual} ms, expected ${expected}`).toBeLessThan(
    tolerance + 0.001,
  );
}

function expectWithin(actual: number, low: number, high: number, label: string) {
  expect(actual, label).toBeGreaterThanOrEqual(low - tolerance);
  expect(actual, label).toBeLessThanOrEqual(high + tolerance);
}

test.describe("the logo's growth", () => {
  test("follows the reference timeline", async ({ page }) => {
    await page.goto("/");
    const animations = await runningAnimations(page);

    const [trunk] = having(animations, "logo-trunk");
    expectNear(trunk.delay, 100, "trunk delay");
    expectNear(trunk.duration, 500, "trunk duration");

    const roots = having(animations, "root");
    expect(roots).toHaveLength(11);
    for (const root of roots) {
      expectWithin(root.delay, 550, 890, "root delay");
      expectWithin(root.duration, 380, 850, "root duration");
    }

    const rootNodes = having(animations, "node");
    expect(rootNodes).toHaveLength(11);
    for (const node of rootNodes) {
      expectWithin(node.delay, 1100, 1360, "root node delay");
      expectNear(node.duration, 380, "root node duration");
    }

    // Six traces per side, plus the right side's own.
    const traces = having(animations, "trace");
    expect(traces).toHaveLength(13);
    for (const trace of traces) {
      expectWithin(trace.delay, 1400, 1750, "trace delay");
      expectWithin(trace.duration, 800, 1400, "trace duration");
    }

    // Ten nodes per side, 1.90 s + 80 ms each.
    const traceNodes = having(animations, "trace-node");
    expect(traceNodes).toHaveLength(20);
    const nodeDelays = traceNodes.map(({ delay }) => delay).sort((a, b) => a - b);
    const expectedDelays = Array.from({ length: 10 }, (_, index) => 1900 + 80 * index)
      .flatMap((delay) => [delay, delay])
      .sort((a, b) => a - b);
    nodeDelays.forEach((delay, index) => {
      expectNear(delay, expectedDelays[index], "trace node delay");
    });
    for (const node of traceNodes) expectNear(node.duration, 380, "trace node duration");

    // The chevrons come down from the bottom one up.
    for (const [chevron, delay] of [
      ["logo-chevron-3", 1700],
      ["logo-chevron-2", 1850],
      ["logo-chevron-1", 2000],
    ] as const) {
      const [animation] = having(animations, chevron);
      expectNear(animation.delay, delay, `${chevron} delay`);
      expectNear(animation.duration, 620, `${chevron} duration`);
    }

    const [ring] = having(animations, "logo-ring");
    expectNear(ring.delay, 2400, "ring delay");
    expectNear(ring.duration, 950, "ring duration");

    // The growth plays once and is done at 3.35 s.
    const once = animations.filter(({ iterations }) => iterations === 1);
    const end = Math.max(...once.map(({ delay, duration }) => delay + duration));
    expectNear(end, 3350, "end of the growth");

    // Then, idle: one travelling dot, 10 s per trip, and the halo breathing
    // over 6 s, as two alternating 3 s halves.
    const idle = animations.filter(({ iterations }) => iterations === Number.POSITIVE_INFINITY);
    expect(idle.map(({ name }) => name).sort()).toEqual(["hero-breathe", "hero-travel"]);
    const [dot] = having(animations, "scene-dot");
    expectNear(dot.delay, 3350, "dot delay");
    expectNear(dot.duration, 10_000, "dot duration");
    const [halo] = having(animations, "hero-halo");
    expectNear(halo.duration, 3000, "halo half-cycle");
    expect(halo.direction).toBe("alternate");
  });

  // The four stages of the growth strip mockup, frozen at their times.
  test("passes through the reference stages", async ({ page }) => {
    await page.goto("/");
    const stageAt = (time: number) =>
      page.evaluate((at) => {
        const hero = document
          .getAnimations()
          .filter((animation) =>
            (animation.effect as KeyframeEffect | null)?.target?.closest(".hero"),
          );
        for (const animation of hero) {
          animation.pause();
          animation.currentTime = at;
        }
        const scene = document.querySelector(".hero-scene");
        if (scene === null) throw new Error("No hero scene");
        const style = (selector: string) =>
          [...scene.querySelectorAll(selector)].map((element) => getComputedStyle(element));
        const visible = (selector: string) =>
          style(selector).filter((computed) => Number(computed.opacity) > 0).length;
        const drawn = (selector: string) =>
          style(selector).filter(
            (computed) =>
              Number(computed.opacity) > 0 && parseFloat(computed.strokeDashoffset) === 0,
          ).length;
        return {
          trunk: visible(".logo-trunk"),
          roots: drawn(".root"),
          rootsVisible: visible(".root"),
          traces: drawn(".trace"),
          tracesVisible: visible(".trace"),
          chevrons: visible(".chevron"),
          ring: visible(".logo-ring"),
          ringDrawn: drawn(".logo-ring"),
        };
      }, time);

    // 1. The trunk grows; nothing else has started.
    expect(await stageAt(450)).toMatchObject({
      trunk: 1,
      rootsVisible: 0,
      tracesVisible: 0,
      chevrons: 0,
      ring: 0,
    });
    // 2. The roots are drawn and the traces leave them, all but the three
    // upper ones, which start at 1.70 and 1.75 s; no chevron yet.
    expect(await stageAt(1600)).toMatchObject({
      roots: 11,
      tracesVisible: 10,
      traces: 0,
      chevrons: 0,
      ring: 0,
    });
    // 3. The chevrons have come down; the ring has just started.
    expect(await stageAt(2450)).toMatchObject({ chevrons: 3, ring: 1, ringDrawn: 0 });
    // 4. Complete: every trace and the ring are drawn.
    expect(await stageAt(3900)).toMatchObject({
      roots: 11,
      traces: 13,
      chevrons: 3,
      ringDrawn: 1,
    });
  });

  test("shows its final state with no animation under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const locale of locales) {
      await page.goto(pathOf("home", locale));
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      const ring = page.locator(".hero-scene .logo-ring");
      await expect(ring).toHaveCSS("opacity", "1");
      await expect(ring).toHaveCSS("stroke-dashoffset", "0px");
      await expect(page.locator(".hero-scene .scene-dot")).toBeHidden();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    }
  });

  test("does not breathe its halo in the light theme", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const animations = await runningAnimations(page);
    expect(having(animations, "hero-halo")).toEqual([]);
  });
});

test.describe("the hero copy", () => {
  test("reveals each line 100 ms apart, the heading only moving", async ({ page }) => {
    await page.goto("/");
    const animations = await runningAnimations(page);
    for (const [targetClass, delay] of [
      ["reveal-1", 100],
      ["hero-title", 200],
      ["reveal-3", 300],
    ] as const) {
      const [animation] = having(animations, targetClass);
      expectNear(animation.delay, delay, `${targetClass} delay`);
      expectNear(animation.duration, 500, `${targetClass} duration`);
    }

    // The heading never changes opacity, so it shows at the first paint.
    const headingKeyframes = await page
      .getByRole("heading", { level: 1 })
      .evaluate((heading) =>
        heading
          .getAnimations()
          .flatMap((animation) => (animation.effect as KeyframeEffect).getKeyframes()),
      );
    expect(headingKeyframes.length).toBeGreaterThan(0);
    for (const keyframe of headingKeyframes) expect(keyframe).not.toHaveProperty("opacity");
  });

  test("has the heading as its Largest Contentful Paint element", async ({ page }) => {
    await page.goto("/");
    const lcp = await page.evaluate(
      () =>
        new Promise<{ inHeading: boolean; tag: string }>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries() as (PerformanceEntry & { element: Element | null })[];
            const element = entries.at(-1)?.element ?? null;
            resolve({ inHeading: element?.closest("h1") !== null, tag: element?.tagName ?? "" });
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }),
    );
    expect(lcp.inHeading, `the LCP element is a ${lcp.tag}`).toBe(true);
  });

  test("shifts no layout while the hero animates", async ({ page }) => {
    await page.goto("/");
    // Wait for every animation that ends: the whole growth and the reveal.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((animation) =>
            (animation.effect as KeyframeEffect | null)?.target?.closest(".hero"),
          )
          .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
          .map((animation) => animation.finished),
      ),
    );
    // A buffered observer holds every shift so far at once (Performance
    // Timeline: observe() copies the buffered entries into its records).
    const shifts = await page.evaluate(() => {
      const observer = new PerformanceObserver(() => {});
      observer.observe({ type: "layout-shift", buffered: true });
      const entries = observer.takeRecords() as (PerformanceEntry & { value: number })[];
      observer.disconnect();
      return entries.map((entry) => entry.value);
    });
    expect(shifts).toEqual([]);
  });

  test("ships no JavaScript beyond the theme and scroll reveal scripts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("script[src]")).toHaveCount(0);
    const scripts = await page.locator("script").allTextContents();
    expect(scripts).toHaveLength(2);
    expect(scripts[0]).toContain("data-theme-toggle");
    expect(scripts[1]).toContain("IntersectionObserver");
  });

  test("shows only the buttons to pages that exist: the offers page", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(pathOf("home", locale));
      const links = page.locator("section.hero").getByRole("link");
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAttribute("href", pathOf("offers", locale));
    }
  });

  test("shows its placeholders as chips, in both languages", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(pathOf("home", locale));
      const placeholders = page.locator("section.hero .placeholder");
      await expect(placeholders.first()).toBeVisible();
      for (const text of await placeholders.allTextContents())
        expect(text).toMatch(/^\[TODO: .+\]$/);
    }
  });
});
