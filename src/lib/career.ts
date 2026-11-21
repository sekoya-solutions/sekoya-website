/**
 * The career's dates (ADR 0004): a position starts and ends in a month,
 * written `YYYY-MM` in the content and shown numerically in both languages,
 * as `05/2022 – 09/2025`. A month not yet provided is a `[TODO: …]`
 * placeholder (ADR 0007), shown as written.
 */

/** A month of a year: `month` from 1 to 12. */
export interface Month {
  readonly year: number;
  readonly month: number;
}

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
const placeholderPattern = /^\[TODO:[^\]]*\]$/;

/** Whether a text is a placeholder alone, `[TODO: …]`. */
export function isPlaceholder(text: string): boolean {
  return placeholderPattern.test(text);
}

/** A month written `YYYY-MM`; undefined for a placeholder; any other text throws. */
export function parseMonth(text: string): Month | undefined {
  if (isPlaceholder(text)) return undefined;
  const match = monthPattern.exec(text);
  if (match === null) throw new Error(`"${text}" is not a YYYY-MM month or a placeholder`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/**
 * The whole months from the start of `start` to the start of `end`: a
 * position from 05/2022 to 09/2025 lasted 40 months, 3 years and 4 months.
 */
export function monthsBetween(start: Month, end: Month): number {
  return (end.year - start.year) * 12 + (end.month - start.month);
}

/** A month as shown, `09/2025`, or the placeholder as written. */
export function numericMonth(text: string): string {
  const month = parseMonth(text);
  return month === undefined ? text : `${String(month.month).padStart(2, "0")}/${month.year}`;
}

/**
 * A position's period as shown: `05/2022 – 09/2025`, or, for the current
 * position (no end), its start and the word for "today".
 */
export function formatPeriod(start: string, end: string | null, present: string): string {
  return `${numericMonth(start)} – ${end === null ? present : numericMonth(end)}`;
}

/** The words for a number of years or months, by plural category. */
export interface UnitWords {
  readonly one: string;
  readonly other: string;
}

/**
 * A duration in whole months, in words: `3 ans 4 mois`, `1 year`,
 * `8 months`. The language's plural rules pick each word.
 */
export function formatDuration(
  months: number,
  locale: string,
  words: { readonly years: UnitWords; readonly months: UnitWords },
): string {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error(`A duration is a positive whole number of months, not ${months}`);
  }
  const plural = new Intl.PluralRules(locale);
  const part = (count: number, unit: UnitWords) =>
    `${count} ${plural.select(count) === "one" ? unit.one : unit.other}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years > 0 ? part(years, words.years) : "", rest > 0 ? part(rest, words.months) : ""]
    .filter((text) => text !== "")
    .join(" ");
}

/** Fills a label's `{name}` slots: `fill("Ring {n}", { n: 3 })` is `Ring 3`. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`"${template}" has no value for ${slot}`);
    return String(value);
  });
}
