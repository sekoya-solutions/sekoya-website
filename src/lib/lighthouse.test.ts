import { describe, expect, it } from "vitest";
import {
  failures,
  localDay,
  measurementFromFiles,
  measurementOf,
  median,
  pageMedians,
  parseMeasurement,
  reportScore,
  type Scores,
  scoreTier,
} from "./lighthouse";

function scores(performance: number, accessibility = 100, bestPractices = 100, seo = 100): Scores {
  return { performance, accessibility, bestPractices, seo };
}

const details = { measuredOn: "2026-11-21", lighthouse: "13.6.0", runs: 3 };

describe("median", () => {
  it("keeps the middle value, whatever the order", () => {
    expect(median([97, 100, 92])).toBe(97);
    expect(median([100])).toBe(100);
  });

  it.each([[[]], [[1, 2]]])("rejects an even number of values: %j", (values) => {
    expect(() => median(values)).toThrow();
  });
});

describe("pageMedians", () => {
  it("takes each category's median on its own", () => {
    const runs = [scores(90, 100, 96), scores(99, 98, 100), scores(95, 99, 92)];
    expect(pageMedians(runs)).toEqual(scores(95, 99, 96));
  });
});

describe("measurementOf", () => {
  const runsByPage = {
    "/": [scores(98), scores(100), scores(99)],
    "/offres": [scores(97, 100, 100, 92), scores(96, 100, 100, 92), scores(100, 100, 100, 100)],
  };

  it("keeps each page's medians, and the lowest of each category as the site's figure", () => {
    const measurement = measurementOf(runsByPage, details);
    expect(measurement.pages).toEqual({ "/": scores(99), "/offres": scores(97, 100, 100, 92) });
    expect(measurement.summary).toEqual(scores(97, 100, 100, 92));
    expect(measurement.measuredOn).toBe("2026-11-21");
  });

  it("rejects a page measured a different number of times", () => {
    expect(() => measurementOf({ "/": [scores(100)] }, details)).toThrow(/1 runs, not 3/);
  });

  it("rejects a measurement of no page", () => {
    expect(() => measurementOf({}, details)).toThrow();
  });
});

describe("failures", () => {
  it("lists each page median below 95, and nothing at 95", () => {
    const measurement = measurementOf(
      {
        "/": [scores(95), scores(95), scores(95)],
        "/quiz": [scores(94, 100, 90), scores(94, 100, 90), scores(94, 100, 90)],
      },
      details,
    );
    expect(failures(measurement)).toEqual(["/quiz performance 94", "/quiz bestPractices 90"]);
  });
});

describe("reportScore", () => {
  it("shows a report's 0 to 1 score from 0 to 100", () => {
    expect(reportScore(0.98, "seo")).toBe(98);
    expect(reportScore(1, "seo")).toBe(100);
    expect(reportScore(0, "seo")).toBe(0);
  });

  it.each([null, undefined, Number.NaN])("rejects a missing score: %j", (value) => {
    expect(() => reportScore(value, "performance")).toThrow(/no performance score/);
  });
});

describe("parseMeasurement", () => {
  const valid = {
    ...details,
    summary: scores(97),
    pages: { "/": scores(99), "/offres": scores(97) },
  };

  it("accepts a well-formed file", () => {
    expect(parseMeasurement(valid)).toEqual(valid);
  });

  it.each([
    ["a summary that is not the lowest page median", { ...valid, summary: scores(99) }],
    ["a score above 100", { ...valid, pages: { "/": scores(101) }, summary: scores(101) }],
    [
      "a score that is not whole",
      { ...valid, pages: { "/": scores(99.5) }, summary: scores(99.5) },
    ],
    ["a missing category", { ...valid, pages: { "/": { performance: 99 } } }],
    ["an unknown field", { ...valid, reportUrl: "https://example.com" }],
    ["a date that is not YYYY-MM-DD", { ...valid, measuredOn: "21/11/2026" }],
    ["no page", { ...valid, pages: {} }],
    ["a page that is not a path", { ...valid, pages: { offres: scores(97), "/": scores(99) } }],
  ])("rejects %s", (_, value) => {
    expect(() => parseMeasurement(value)).toThrow();
  });
});

describe("measurementFromFiles", () => {
  it("is undefined when the file does not exist, so the pages say it is pending", () => {
    expect(measurementFromFiles({})).toBeUndefined();
  });

  it("reads the file when it exists", () => {
    const file = { ...details, summary: scores(99), pages: { "/": scores(99) } };
    expect(measurementFromFiles({ "../data/lighthouse.json": file })).toEqual(file);
  });

  it("fails on a malformed file rather than showing it", () => {
    expect(() => measurementFromFiles({ "../data/lighthouse.json": { summary: {} } })).toThrow();
  });
});

describe("scoreTier", () => {
  it.each([
    [100, "good"],
    [90, "good"],
    [89, "average"],
    [50, "average"],
    [49, "poor"],
    [0, "poor"],
  ] as const)("puts %i in %s", (value, tier) => {
    expect(scoreTier(value)).toBe(tier);
  });
});

describe("localDay", () => {
  it("writes the local calendar day as YYYY-MM-DD", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDay(new Date(2026, 10, 21, 0, 0))).toBe("2026-11-21");
  });
});
