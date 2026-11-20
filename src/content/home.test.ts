import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";

// The home page's copy (src/content/home): every language has the same
// fields, and the same buttons to the same pages.
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

describe("the home copy", () => {
  const french = leaves(entries.fr);

  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(entries[locale]).keys()]).toEqual([...french.keys()]);
  });

  it.each(locales)("%s links its buttons to the same pages as French", (locale) => {
    const targets = (entry: { hero: { actions: { page: string; variant: string }[] } }) =>
      entry.hero.actions.map(({ page, variant }) => [page, variant]);
    expect(targets(entries[locale])).toEqual(targets(entries.fr));
  });
});
