import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../lib/contrast";

// The colour tokens of each theme, read from tokens.css itself, with var()
// references resolved. The rendered values are checked in the browser by
// e2e/theme.spec.ts; these tests check the brand values and the contrast
// pairs (ADR 0003).
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function block(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`tokens.css has no "${selector}" block`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return new Map(
    [...body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((match) => [match[1], match[2].trim()]),
  );
}

const dark = block(":root");
const light = new Map([...dark, ...block(':root[data-theme="light"]')]);

function colour(theme: Map<string, string>, name: string): string {
  let value = theme.get(name);
  for (let depth = 0; value?.startsWith("var(") && depth < 5; depth += 1) {
    value = theme.get(value.slice(4, -1));
  }
  if (value === undefined || !/^#[0-9a-f]{6}$/.test(value)) {
    throw new Error(`${name} is not a #rrggbb colour: ${value}`);
  }
  return value;
}

describe("brand colours", () => {
  it.each([
    ["--bg", "#0a1d24", "#f6f1e8"],
    ["--mint", "#22c08a", "#16927a"],
    ["--gold", "#e8d3a8", "#a8893f"],
    ["--grey", "#9dbdcc", "#4a6577"],
    ["--ink", "#eef4f6", "#0e262f"],
    ["--surface-1", "#0e262f", "#ffffff"],
    ["--surface-2", "#123039", "#efe8da"],
    ["--primary", "#22c08a", "#0f6b5a"],
    ["--primary-text", "#0a1d24", "#ffffff"],
    ["--link", "#22c08a", "#0f6b5a"],
    ["--danger", "#ef7f6b", "#b4472f"],
    ["--logo-canopy", "#22c08a", "#16927a"],
    ["--logo-gold", "#e8d3a8", "#a8893f"],
    ["--logo-roots", "#9dbdcc", "#4a6577"],
  ])("%s is %s in the dark theme and %s in the light one", (name, darkValue, lightValue) => {
    expect(colour(dark, name)).toBe(darkValue);
    expect(colour(light, name)).toBe(lightValue);
  });
});

// WCAG 2.2 AA: 4.5:1 for text, 3:1 for large text and for the focus ring.
// Light-theme deep gold (--gold, --accent) is for shapes only and the brand
// green (--mint) for large text, icons and strokes only.
const text = 4.5;
const large = 3;
const themes = { dark, light };
const pairs: Array<[keyof typeof themes, string, string, number]> = [
  ["dark", "--ink", "--bg", text],
  ["dark", "--ink", "--surface-1", text],
  ["dark", "--mint", "--bg", text],
  ["dark", "--gold", "--bg", text],
  ["dark", "--grey", "--bg", text],
  ["dark", "--grey", "--surface-1", text],
  ["dark", "--link", "--bg", text],
  ["dark", "--primary-text", "--primary", text],
  ["dark", "--danger", "--bg", text],
  ["dark", "--focus", "--bg", large],
  ["dark", "--focus", "--surface-1", large],
  ["light", "--ink", "--bg", text],
  ["light", "--ink", "--surface-1", text],
  ["light", "--grey", "--bg", text],
  ["light", "--grey", "--surface-1", text],
  ["light", "--link", "--bg", text],
  ["light", "--link", "--surface-1", text],
  ["light", "--primary-text", "--primary", text],
  ["light", "--danger", "--bg", text],
  ["light", "--mint", "--bg", large],
  ["light", "--focus", "--bg", large],
  ["light", "--focus", "--surface-1", large],
];

describe("contrast pairs", () => {
  it.each(pairs)("%s theme: %s on %s reaches %d:1", (name, foreground, background, min) => {
    const theme = themes[name];
    expect(
      contrastRatio(colour(theme, foreground), colour(theme, background)),
    ).toBeGreaterThanOrEqual(min);
  });
});
