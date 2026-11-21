/**
 * This site's Lighthouse figures (ADR 0007): `npm run lighthouse` measures
 * each page several times on mobile and writes, per page, the median score of
 * each category, and, as the site's figure, the lowest page median of each
 * category, with the date, into src/data/lighthouse.json. The footer and the
 * portfolio read that file; with no file, they say the measurement is pending
 * and show no number.
 */
import { z } from "astro/zod";

/** The four categories, in the order they are shown. */
export const categories = ["performance", "accessibility", "bestPractices", "seo"] as const;

export type Category = (typeof categories)[number];

/** Lighthouse's own identifier of each category, in its report. */
export const reportCategoryIds: Readonly<Record<Category, string>> = {
  performance: "performance",
  accessibility: "accessibility",
  bestPractices: "best-practices",
  seo: "seo",
};

/** A score per category, from 0 to 100, as Lighthouse shows it. */
export type Scores = Readonly<Record<Category, number>>;

/** The lowest score a page may have in any category, in CI and locally (ADR 0006). */
export const minimumScore = 95;

const score = z.number().int().min(0).max(100);
const scores = z.strictObject({
  performance: score,
  accessibility: score,
  bestPractices: score,
  seo: score,
});

const measurementSchema = z
  .strictObject({
    /** The day of the measurement, `YYYY-MM-DD`. */
    measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** The Lighthouse version that measured. */
    lighthouse: z.string().min(1),
    /** The runs per page, whose median is kept. */
    runs: z.number().int().positive(),
    /** The site's figure: the lowest page median of each category. */
    summary: scores,
    /** Each page's medians, by path. */
    pages: z.record(z.string().startsWith("/"), scores),
  })
  .refine(
    ({ pages, summary }) =>
      Object.keys(pages).length > 0 &&
      categories.every((category) => summary[category] === lowest(pages, category)),
    { message: "The summary must be the lowest page median of each category" },
  );

export type Measurement = z.infer<typeof measurementSchema>;

function lowest(pages: Readonly<Record<string, Scores>>, category: Category): number {
  return Math.min(...Object.values(pages).map((page) => page[category]));
}

/** The median of an odd number of values; an even or empty list throws. */
export function median(values: readonly number[]): number {
  if (values.length % 2 === 0) {
    throw new Error(`The median needs an odd number of values, not ${values.length}`);
  }
  return [...values].sort((a, b) => a - b)[(values.length - 1) / 2];
}

/** A page's median score in each category, over its runs. */
export function pageMedians(runs: readonly Scores[]): Scores {
  return Object.fromEntries(
    categories.map((category) => [category, median(runs.map((run) => run[category]))]),
  ) as Record<Category, number>;
}

/** The measurement file's content, from each page's runs. */
export function measurementOf(
  runsByPage: Readonly<Record<string, readonly Scores[]>>,
  details: { measuredOn: string; lighthouse: string; runs: number },
): Measurement {
  const pages = Object.fromEntries(
    Object.entries(runsByPage).map(([path, runs]) => {
      if (runs.length !== details.runs) {
        throw new Error(`${path} has ${runs.length} runs, not ${details.runs}`);
      }
      return [path, pageMedians(runs)];
    }),
  );
  const summary = Object.fromEntries(
    categories.map((category) => [category, lowest(pages, category)]),
  ) as Record<Category, number>;
  return measurementSchema.parse({ ...details, summary, pages });
}

/** Every page median below the minimum score, as `path category score`. */
export function failures(measurement: Measurement): string[] {
  return Object.entries(measurement.pages).flatMap(([path, page]) =>
    categories
      .filter((category) => page[category] < minimumScore)
      .map((category) => `${path} ${category} ${page[category]}`),
  );
}

/** A category's score from a Lighthouse report: from 0 to 1, shown as 0 to 100. */
export function reportScore(value: number | null | undefined, category: Category): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`The report has no ${category} score`);
  }
  return Math.round(value * 100);
}

/** The measurement file's content, checked; a malformed file throws. */
export function parseMeasurement(value: unknown): Measurement {
  return measurementSchema.parse(value);
}

/**
 * The measurement, from the result of a glob on its file: `undefined` when
 * the file does not exist, so the pages say the measurement is pending.
 */
export function measurementFromFiles(
  files: Readonly<Record<string, unknown>>,
): Measurement | undefined {
  const contents = Object.values(files);
  if (contents.length > 1) throw new Error("Only one measurement file is expected");
  return contents.length === 0 ? undefined : parseMeasurement(contents[0]);
}

/** A score's colour: mint from 90, gold from 50, danger below. */
export function scoreTier(value: number): "good" | "average" | "poor" {
  if (value >= 90) return "good";
  if (value >= 50) return "average";
  return "poor";
}

/** The local calendar day of a moment, `YYYY-MM-DD`. */
export function localDay(moment: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}

/** The measurement file on GitHub, in a repository: the source the portfolio links to. */
export function measurementSource(repository: string): string {
  return `${repository}/blob/main/src/data/lighthouse.json`;
}
