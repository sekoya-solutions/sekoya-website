import { describe, expect, it } from "vitest";
import {
  fill,
  formatDuration,
  formatPeriod,
  isPlaceholder,
  monthsBetween,
  numericMonth,
  parseMonth,
} from "./career";

// The career's dates (#18): months written YYYY-MM, shown numerically, and
// durations in words.

const french = { years: { one: "an", other: "ans" }, months: { one: "mois", other: "mois" } };
const english = {
  years: { one: "year", other: "years" },
  months: { one: "month", other: "months" },
};

describe("a month", () => {
  it("is read from YYYY-MM, a placeholder giving none", () => {
    expect(parseMonth("2022-05")).toEqual({ year: 2022, month: 5 });
    expect(parseMonth("[TODO: date]")).toBeUndefined();
    expect(isPlaceholder("[TODO: date]")).toBe(true);
    expect(isPlaceholder("2022-05")).toBe(false);
  });

  it("refuses any other text", () => {
    for (const text of ["2022-13", "2022-5", "05/2022", "", "2022-05 [TODO: x]"]) {
      expect(() => parseMonth(text)).toThrow("YYYY-MM");
    }
  });

  it("is shown as MM/YYYY, a placeholder as written", () => {
    expect(numericMonth("2025-09")).toBe("09/2025");
    expect(numericMonth("[TODO: date]")).toBe("[TODO: date]");
  });
});

describe("a period", () => {
  it("is shown from its start to its end, or to today for the current position", () => {
    expect(formatPeriod("2022-05", "2025-09", "aujourd'hui")).toBe("05/2022 – 09/2025");
    expect(formatPeriod("2025-10", null, "today")).toBe("10/2025 – today");
    expect(formatPeriod("[TODO: début]", null, "today")).toBe("[TODO: début] – today");
  });

  it("lasts the whole months between its start and its end", () => {
    expect(monthsBetween({ year: 2022, month: 5 }, { year: 2025, month: 9 })).toBe(40);
    expect(monthsBetween({ year: 2024, month: 11 }, { year: 2025, month: 2 })).toBe(3);
  });
});

describe("a duration", () => {
  it("is said in years and months, with the language's plurals", () => {
    expect(formatDuration(40, "fr", french)).toBe("3 ans 4 mois");
    expect(formatDuration(13, "fr", french)).toBe("1 an 1 mois");
    expect(formatDuration(24, "fr", french)).toBe("2 ans");
    expect(formatDuration(8, "fr", french)).toBe("8 mois");
    expect(formatDuration(40, "en", english)).toBe("3 years 4 months");
    expect(formatDuration(13, "en", english)).toBe("1 year 1 month");
  });

  it("refuses a duration that is not a positive whole number of months", () => {
    expect(() => formatDuration(0, "fr", french)).toThrow("positive");
    expect(() => formatDuration(1.5, "fr", french)).toThrow("positive");
  });
});

describe("a label's slots", () => {
  it("are filled by name, a missing value throwing", () => {
    expect(fill("Anneau n° {n} depuis le centre", { n: 3 })).toBe("Anneau n° 3 depuis le centre");
    expect(fill("{start} à {end}", { start: "05/2022", end: "09/2025" })).toBe("05/2022 à 09/2025");
    expect(() => fill("Ring {n}", {})).toThrow("{n}");
  });
});
