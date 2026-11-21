import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { type Locale, locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The self-assessment quiz (#19): one question per step, the result screen
// with its score, level, priorities, offers and call to action, the
// keyboard path, no network request and no storage write during a run, the
// printable checklist without scripting, reduced motion, and the page's
// JavaScript budget (ADR 0005).

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The quiz copy of a language, as the content file writes it. */
function quizCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/quiz/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

interface Question {
  id: string;
  category: string;
  question: string;
  answers: { label: string; score: number }[];
  advice: Record<"1" | "2", string>;
}

const fr = quizCopy("fr");
const questions: Question[] = fr.questions;

/**
 * The answers of the mockup's result, 11 / 20, as each answer's place (0, 1
 * or 2): its priorities are the tests and the debt (2 points), then CI/CD
 * (1 point, the first in the quiz's order).
 */
const mockup = [2, 1, 0, 1, 2, 1, 1, 1, 1, 1];

/** The quiz page, hydrated: its island has rendered on the client. */
async function openQuiz(page: Page, locale: Locale = "fr") {
  await page.goto(pathOf("quiz", locale));
  await expect(page.locator("astro-island:not([ssr])")).toHaveCount(1);
}

/** Answers every question with the mouse, by each answer's place. */
async function answerAll(page: Page, places: number[]) {
  for (const [index, place] of places.entries()) {
    const question = questions[index];
    if (question === undefined) throw new Error("no question");
    await page
      .getByRole("radio", { name: typeset(question.answers[place]?.label ?? "", "fr") })
      .check();
    await page
      .getByRole("button", {
        name: index === places.length - 1 ? fr.labels.finish : fr.labels.next,
      })
      .click();
  }
}

for (const locale of locales) {
  test(`the quiz shows its heading and the first question in ${locale}`, async ({ page }) => {
    const copy = quizCopy(locale);
    await openQuiz(page, locale);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(typeset(copy.title, locale));
    const group = main.getByRole("group", { name: typeset(copy.questions[0].question, locale) });
    await expect(group.getByRole("radio")).toHaveCount(3);
    await expect(main.getByText(`Question 1 / ${copy.questions.length}`)).toBeVisible();
    // Next waits for an answer; there is no Previous on the first question.
    await expect(main.getByRole("button", { name: copy.labels.next })).toBeDisabled();
    await expect(main.getByRole("button", { name: copy.labels.previous })).toHaveCount(0);
    // With scripting, the checklist is the fallback and stays hidden.
    await expect(main.locator(".quiz-checklist")).toBeHidden();
  });
}

test("a full run gives the mockup's result, with no request and no storage write", async ({
  page,
}) => {
  // Every way a page can store something is watched from the start.
  await page.addInitScript(() => {
    const writes: string[] = [];
    (window as unknown as { quizWrites: string[] }).quizWrites = writes;
    for (const method of ["setItem", "removeItem", "clear"] as const) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (this: Storage, ...args: never[]) {
        writes.push(`storage.${method}`);
        return (original as (...values: never[]) => unknown).apply(this, args);
      } as never;
    }
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    Object.defineProperty(document, "cookie", {
      get: () => cookie?.get?.call(document),
      set: (value: string) => {
        writes.push("cookie");
        cookie?.set?.call(document, value);
      },
    });
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args: Parameters<IDBFactory["open"]>) => {
      writes.push("indexedDB");
      return open(...args);
    };
  });
  await openQuiz(page);
  await page.waitForLoadState("networkidle");
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await answerAll(page, mockup);

  const result = page.getByRole("region", { name: fr.labels.result.eyebrow });
  await expect(result.getByText("11 sur 20", { exact: false })).toBeAttached();
  await expect(result.getByText(fr.levels[1].title)).toBeVisible();
  await expect(result.getByRole("heading", { level: 3 })).toHaveText(
    fr.labels.result.priorities.other.replace("{n}", "3"),
  );
  const priorities = result.getByRole("listitem").filter({ has: page.locator(".quiz-rank") });
  await expect(priorities.locator("strong")).toHaveText(
    ["tests", "debt", "ci"].map(
      (id) => questions.find((question) => question.id === id)?.category ?? "",
    ),
  );
  await expect(priorities.locator(".quiz-tag")).toHaveText([
    fr.labels.result.priority,
    fr.labels.result.priority,
    fr.labels.result.watch,
  ]);
  await expect(priorities.nth(2)).toContainText(typeset(questions[1]?.advice["1"] ?? "", "fr"));
  await expect(result.getByRole("link", { name: fr.levels[1].action.label })).toHaveAttribute(
    "href",
    `${pathOf("contact", "fr")}?sujet=audit`,
  );
  await expect(result.locator(".quiz-offer")).toHaveAttribute(
    "href",
    `${pathOf("offers", "fr")}#audit`,
  );

  expect(requests).toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as { quizWrites: string[] }).quizWrites),
  ).toEqual([]);
});

test("the result has no accessibility violations", async ({ page }) => {
  await openQuiz(page);
  await answerAll(page, mockup);
  await expect(page.locator(".quiz-result")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);
});

test("all answers worth 0 give a healthy project and no priority", async ({ page }) => {
  await openQuiz(page);
  await answerAll(page, Array(10).fill(0));
  const result = page.locator(".quiz-result");
  await expect(result.getByText(fr.levels[0].title)).toBeVisible();
  await expect(result.getByText(typeset(fr.labels.result.none, "fr"))).toBeVisible();
  await expect(result.locator(".quiz-priorities")).toHaveCount(0);
  await expect(result.getByRole("link", { name: fr.levels[0].action.label })).toHaveAttribute(
    "href",
    `${pathOf("contact", "fr")}?sujet=audit`,
  );
});

test("all answers worth 2 give a project under strain, with the rescue offers", async ({
  page,
}) => {
  await openQuiz(page);
  await answerAll(page, Array(10).fill(2));
  const result = page.locator(".quiz-result");
  await expect(result.getByText(fr.levels[2].title)).toBeVisible();
  // Three priorities at most, in the quiz's order on a tie.
  await expect(result.locator(".quiz-priorities strong")).toHaveText(
    questions.slice(0, 3).map((question) => question.category),
  );
  await expect(result.locator(".quiz-offer")).toHaveCount(2);
  await expect(result.getByRole("link", { name: fr.levels[2].action.label })).toHaveAttribute(
    "href",
    `${pathOf("contact", "fr")}?sujet=sauvetage`,
  );
});

test("the keyboard answers, goes back and reaches the result's heading", async ({ page }) => {
  await openQuiz(page);
  await page.locator("h1").click();
  await page.keyboard.press("2");
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  await expect(page.getByRole("radio").nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  // Focus moves to the next question.
  const second = page.getByRole("heading", {
    level: 2,
    name: typeset(questions[1]?.question ?? "", "fr"),
  });
  await expect(second).toBeFocused();
  // Enter without an answer stays on the question.
  await page.keyboard.press("Enter");
  await expect(second).toBeVisible();
  // Backspace goes back, with the answer kept.
  await page.keyboard.press("Backspace");
  await expect(
    page.getByRole("heading", { level: 2, name: typeset(questions[0]?.question ?? "", "fr") }),
  ).toBeFocused();
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  await page.keyboard.press("Enter");
  for (let index = 1; index < questions.length; index += 1) {
    await page.keyboard.press("3");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("#quiz-result-title")).toBeFocused();
  // Restart: back to the first question, with no answer.
  await page.getByRole("button", { name: fr.labels.result.restart }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: typeset(questions[0]?.question ?? "", "fr") }),
  ).toBeFocused();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
});

test("keys pressed faster than the page renders all count", async ({ page }) => {
  await openQuiz(page);
  // Twenty key presses in one task: no render can happen between them.
  await page.evaluate(() => {
    for (let index = 0; index < 10; index += 1) {
      for (const key of ["2", "Enter"]) {
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      }
    }
  });
  await expect(page.locator("#quiz-result-title")).toBeFocused();
  await expect(page.locator(".quiz-result").getByText("10 sur 20")).toBeAttached();
});

test.describe("on a touch screen", () => {
  test("the keyboard hint is hidden", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "the mobile project has a touch screen");
    await openQuiz(page);
    await expect(page.locator(".quiz-keys")).toBeHidden();
  });
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the result appears with nothing moving", async ({ page }) => {
    await openQuiz(page);
    await answerAll(page, mockup);
    await expect(page.locator(".quiz-result")).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of locales) {
    test(`the page shows the printable checklist and the levels in ${locale}`, async ({ page }) => {
      const copy = quizCopy(locale);
      await page.goto(pathOf("quiz", locale));
      await expect(page.locator(".quiz-card")).toBeHidden();
      const checklist = page.getByRole("region", {
        name: typeset(copy.labels.checklist.title, locale),
      });
      await expect(checklist).toBeVisible();
      await expect(checklist.locator(".checklist-item")).toHaveCount(copy.questions.length);
      await expect(checklist.locator(".checklist-answer")).toHaveCount(copy.questions.length * 3);
      await expect(checklist.locator(".checklist-question").first()).toHaveText(
        typeset(copy.questions[0].question, locale),
      );
      const rows = checklist.getByRole("table").locator("tbody tr");
      await expect(rows).toHaveCount(3);
      await expect(rows.first()).toContainText(copy.levels[0].title);
    });
  }
});

test("the page's JavaScript stays within 15 KB compressed", async ({ page }) => {
  const scripts: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") scripts.push(response.text());
  });
  await openQuiz(page);
  await page.waitForLoadState("networkidle");
  const inline = await page
    .locator("script:not([src])")
    .evaluateAll((elements) => elements.map((element) => element.textContent ?? ""));
  const loaded = await Promise.all(scripts);
  // The island's runtime, the island and Preact, at least.
  expect(loaded.length).toBeGreaterThanOrEqual(3);
  const total = [...loaded, ...inline].reduce((sum, code) => sum + gzipSync(code).length, 0);
  expect(total).toBeLessThanOrEqual(15 * 1024);
});
