import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";

// The home page's copy (src/content/home): every language has the same
// fields, and the same values wherever a value is not words: the pages linked
// to, the button styles, icons, images, external addresses, dates and scores.
const entries = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`./home/${locale}.json`, import.meta.url), "utf8")),
  ]),
);

/** Every leaf of a JSON value, by its dotted path, array items included. */
function leaves(value: unknown, path = ""): Map<string, unknown> {
  if (typeof value !== "object" || value === null) return new Map([[path, value]]);
  const result = new Map<string, unknown>();
  for (const [key, item] of Object.entries(value)) {
    for (const entry of leaves(item, path === "" ? key : `${path}.${key}`)) result.set(...entry);
  }
  return result;
}

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(page|variant|icon|image|href|measuredOn|score|max)$/;

/** Leaves that are not words: a stack item, a role, a period. */
function shared(entry: unknown): [string, unknown][] {
  return [...leaves(entry)].filter(([path]) => sharedFields.test(path));
}

describe("the home copy", () => {
  const french = leaves(entries.fr);

  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(entries[locale]).keys()]).toEqual([...french.keys()]);
  });

  it.each(locales)("%s links to the same pages, with the same values, as French", (locale) => {
    expect(shared(entries[locale])).toEqual(shared(entries.fr));
  });

  it("has links, so the comparison above checks something", () => {
    expect(shared(entries.fr).filter(([path]) => path.endsWith(".page"))).toHaveLength(8);
  });
});
