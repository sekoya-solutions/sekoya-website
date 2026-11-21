import { readFileSync } from "node:fs";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { demoSize } from "../src/components/portfolio/demo-facade";
import { projectSlugs, projectsFolder } from "../src/content/slugs";
import { locales } from "../src/i18n/config";
import { pathOf, projectKey } from "../src/i18n/routes";
import { numericDate } from "../src/lib/dates";
import { ghostSpan } from "../src/lib/portfolio-grid";

// The portfolio (#14): a card per project file, in both languages; the ghost
// card filling the last row; the filters, which work without JavaScript; each
// project's page with its dated figures; and the playable demo, which loads
// only after a click, and only on a desktop browser.

/** The portfolio's copy of a language, as the content file writes it. */
function pageCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/portfolio-page/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** A project file's frontmatter, as written. */
function frontmatter(locale: string, slug: string): string {
  const file = new URL(`../${projectsFolder}/${locale}/${slug}.mdx`, import.meta.url);
  return readFileSync(file, "utf8").split(/^---$/m)[1] ?? "";
}

/** A plain top-level field of a project's frontmatter, such as `span: 2`. */
function field(locale: string, slug: string, name: string): string {
  const value = new RegExp(`^${name}: (.+)$`, "m").exec(frontmatter(locale, slug))?.[1];
  if (value === undefined) throw new Error(`${slug} (${locale}) has no ${name}`);
  return value.replace(/^"(.*)"$/, "$1");
}

/** A project's demo, when it has one. */
function demoOf(slug: string): { kind: string; url: string } | undefined {
  const match = /^demo:\n {2}kind: (\w+)\n {2}url: (.+)$/m.exec(frontmatter("fr", slug));
  return match === null ? undefined : { kind: match[1] ?? "", url: match[2] ?? "" };
}

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

/** The projects in their grid order. */
const slugs = projectSlugs().sort(
  (a, b) => Number(field("fr", a, "order")) - Number(field("fr", b, "order")),
);
const spans = slugs.map((slug) => Number(field("fr", slug, "span")));

/** The project with a playable demo, and its demo. */
const playable = slugs.find((slug) => demoOf(slug)?.kind === "play") ?? "";
const demo = demoOf(playable);
const demoOrigin = demo === undefined ? "" : new URL(demo.url).origin;

/**
 * Serves a stand-in for the demo, so no test downloads the real one, and
 * records every request to its host.
 */
async function stubDemo(context: BrowserContext): Promise<string[]> {
  const requests: string[] = [];
  await context.route(`${demoOrigin}/**`, (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Demo</title><p>Demo stand-in</p>",
    });
  });
  return requests;
}

/** The cards and the ghost card that are shown, in order. */
function shownCards(page: Page) {
  return page.locator(".projects > li:visible");
}

test("the portfolio has a project with a playable demo to check", () => {
  expect(demo?.url).toMatch(/^https:\/\//);
});

for (const locale of locales) {
  test(`the portfolio lists every project in ${locale}`, async ({ page }) => {
    const copy = pageCopy(locale);
    await page.goto(pathOf("portfolio", locale));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(typeset(copy.title, locale));
    const cards = main.locator(".project");
    await expect(cards).toHaveCount(slugs.length);
    for (const [index, slug] of slugs.entries()) {
      const card = cards.nth(index);
      const link = card.getByRole("heading", { level: 2 }).getByRole("link");
      await expect(link).toHaveText(typeset(field(locale, slug, "title"), locale));
      await expect(link).toHaveAttribute("href", pathOf(projectKey(slug), locale));
      await expect(card).toHaveAttribute("data-category", field(locale, slug, "category"));
    }
    await expect(main.locator('label[for="filter-all"]')).toHaveText(
      `${copy.filters.all} · ${slugs.length}`,
    );
  });

  for (const slug of slugs) {
    test(`the ${slug} page shows its parts and dated figures in ${locale}`, async ({ page }) => {
      const copy = pageCopy(locale);
      await page.goto(pathOf(projectKey(slug), locale));
      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1 })).toHaveText(
        typeset(field(locale, slug, "title"), locale),
      );
      await expect(main.locator(".project-body li")).not.toHaveCount(0);
      await expect(main.getByRole("link", { name: copy.labels.back })).toHaveAttribute(
        "href",
        pathOf("portfolio", locale),
      );
      await expect(main.locator(`a[href="${field(locale, slug, "repo")}"]`)).toHaveCount(1);

      // Each figure shows its date and links to its source (ADR 0007).
      const dates = [...frontmatter(locale, slug).matchAll(/measuredOn: "(\d{4}-\d{2}-\d{2})"/g)];
      const text = (await main.textContent()) ?? "";
      for (const [, date] of dates) expect(text).toContain(numericDate(date ?? ""));
      const sources = [...frontmatter(locale, slug).matchAll(/^ +source: (https:\S+)$/gm)];
      for (const [, source] of sources) {
        await expect(main.locator(`a[href="${source}"]`).first()).toBeVisible();
      }
      if (/^lighthouse: this-site$/m.test(frontmatter(locale, slug))) {
        await expect(main.locator(".scores")).toContainText(copy.labels.lighthousePending);
        await expect(main.locator(".scores-ring")).toHaveCount(0);
      }
    });
  }
}

test("the ghost card fills the last row, or is not shown", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Checked at each width from a desktop.");
  for (const [width, columns] of [
    [390, 1],
    [800, 2],
    [1280, 3],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pathOf("portfolio", "fr"));
    const ghost = page.locator(".ghost");
    const expected = ghostSpan(spans, columns);
    if (expected === 0) {
      await expect(ghost).toBeHidden();
      continue;
    }
    await expect(ghost).toBeVisible();
    // It ends the last row: its right edge is the grid's, level with the last
    // card. Layout offsets, which the scroll reveal's movement does not change.
    const layout = await page.evaluate(() => {
      const box = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) throw new Error("Not laid out");
        return { left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth };
      };
      const cards = document.querySelectorAll(".project");
      const list = document.querySelector(".projects");
      return {
        grid: box(list),
        ghost: box(document.querySelector(".ghost")),
        last: box(cards[cards.length - 1] ?? null),
        gap: list === null ? 0 : Number.parseFloat(getComputedStyle(list).columnGap),
      };
    });
    const { grid, ghost: box, last, gap } = layout;
    expect(Math.abs(box.left + box.width - (grid.left + grid.width))).toBeLessThan(1);
    expect(box.top).toBe(last.top);
    // And it spans the expected number of columns.
    const column = (grid.width - (columns - 1) * gap) / columns;
    const cells = Math.round((box.width + gap) / (column + gap));
    expect(cells).toBe(expected);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the filters show one category's projects, then all of them", async ({ page }) => {
    const copy = pageCopy("fr");
    await page.goto(pathOf("portfolio", "fr"));
    const main = page.getByRole("main");
    const categories = [...new Set(slugs.map((slug) => field("fr", slug, "category")))];
    for (const category of categories) {
      await main.locator(`label[for="filter-${category}"]`).click();
      await expect(main.locator(`#filter-${category}`)).toBeChecked();
      const shown = slugs.filter((slug) => field("fr", slug, "category") === category);
      await expect(shownCards(page)).toHaveCount(shown.length);
      for (const card of await shownCards(page).all()) {
        await expect(card).toHaveAttribute("data-category", category);
      }
      await expect(main.locator(".ghost")).toBeHidden();
    }
    await main.getByText(`${copy.filters.all} · ${slugs.length}`).click();
    await expect(main.locator(".project:visible")).toHaveCount(slugs.length);
  });

  test("the filters work from the keyboard", async ({ page }) => {
    await page.goto(pathOf("portfolio", "fr"));
    const all = page.locator("#filter-all");
    await all.focus();
    await page.keyboard.press("ArrowRight");
    const next = page.locator(".filter-input").nth(1);
    await expect(next).toBeChecked();
    await expect(next).toBeFocused();
    await expect(page.locator(".filter-input:focus-visible + .filter")).toHaveCSS(
      "outline-style",
      "solid",
    );
  });

  test("the demo's play button is a plain link to the demo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The button shows on a desktop browser.");
    await page.goto(pathOf(projectKey(playable), "fr"));
    await expect(page.locator("a[data-demo-play]")).toHaveAttribute("href", demo?.url ?? "");
    await expect(page.locator("a[data-demo-play]")).toBeVisible();
  });
});

test("the demo loads only after a click, on a desktop browser", async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The demo plays on a desktop browser.");
  const requests = await stubDemo(context);
  const copy = pageCopy("fr");
  await page.goto(pathOf(projectKey(playable), "fr"));
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".demo-notice")).toBeHidden();

  await page.locator("a[data-demo-play]").click();
  const frame = page.locator(".demo-frame iframe");
  await expect(frame).toHaveAttribute("src", demo?.url ?? "");
  await expect(frame).toHaveAttribute(
    "title",
    `${field("fr", playable, "title")} — ${copy.demo.frameTitle}`,
  );
  await expect(frame).toBeFocused();
  // The frame is big enough for the demo's fixed-size page: no scrollbar.
  const inner = await frame.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));
  expect(inner.width).toBeGreaterThanOrEqual(demoSize.width);
  expect(inner.height).toBeGreaterThanOrEqual(demoSize.height);
  // The page stays on the project, and the demo loads in the frame.
  await expect(page).toHaveURL(pathOf(projectKey(playable), "fr"));
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  await expect(page.frameLocator(".demo-frame iframe").getByText("Demo stand-in")).toBeVisible();
});

test("below 1280 px or on a touch screen, a notice and a link replace the demo", async ({
  page,
  context,
}, testInfo) => {
  const requests = await stubDemo(context);
  if (testInfo.project.name !== "mobile") await page.setViewportSize({ width: 1270, height: 900 });
  await page.goto(pathOf(projectKey(playable), "fr"));
  await expect(page.locator("a[data-demo-play]")).toBeHidden();
  const notice = page.locator(".demo-notice");
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link")).toHaveAttribute("href", demo?.url ?? "");
  // The card's play pill is not shown either.
  await page.goto(pathOf("portfolio", "fr"));
  await expect(page.locator(".project-play")).toBeHidden();
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("only a page with a playable demo allows frames, from the demo's origin", async ({ page }) => {
  const policy = async (path: string) => {
    await page.goto(path);
    return page.locator('meta[http-equiv="content-security-policy"]').getAttribute("content");
  };
  expect(await policy(pathOf(projectKey(playable), "fr"))).toContain(`frame-src ${demoOrigin}`);
  for (const path of [pathOf("portfolio", "fr"), pathOf("home", "fr")]) {
    expect(await policy(path)).not.toContain("frame-src");
  }
});

test("from 1280 px, the demo's frame fits the demo and the page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Checked at desktop widths.");
  // A classic page scrollbar, as on Windows, takes this much of the width; the
  // test browser may draw none, so it is counted here.
  const scrollbar = 17;
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pathOf(projectKey(playable), "fr"));
    const layout = await page.locator(".demo-frame").evaluate((frame) => ({
      width: frame.clientWidth,
      height: frame.clientHeight,
      drawnScrollbar: window.innerWidth - document.documentElement.clientWidth,
      pageScrolls: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(layout.pageScrolls).toBe(false);
    expect(layout.height).toBeGreaterThanOrEqual(demoSize.height);
    expect(layout.width - (scrollbar - layout.drawnScrollbar)).toBeGreaterThanOrEqual(
      demoSize.width,
    );
  }
});
