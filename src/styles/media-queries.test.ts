import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ADR 0010: media queries use only the widths 48, 64 and 80 rem and the
// height 45 rem; preference and capability queries are free. Every style in
// src is read (the <style> blocks of components and the style sheets), and
// so are Tailwind's breakpoints and the responsive variants in class lists,
// which compile to media queries too. A container query carries a comment
// naming what stops fitting at its width.

const steps = "(?:48|64|80)rem";
const allowedSize = [
  new RegExp(`^min-width:\\s*${steps}$`),
  new RegExp(`^width\\s*>=\\s*${steps}$`),
  new RegExp(`^width\\s*<\\s*${steps}$`),
  new RegExp(`^${steps}\\s*<=\\s*width\\s*<\\s*${steps}$`),
  /^height\s*<\s*45rem$/,
];
const freeFeature =
  /^(?:prefers-reduced-motion|prefers-color-scheme|prefers-contrast|forced-colors|scripting|hover|any-hover|pointer|any-pointer)(?:\s*:\s*[a-z-]+)?$/;

/** Why a media query's condition breaks ADR 0010, or undefined when it does not. */
function mediaQueryProblem(condition: string): string | undefined {
  const features = [...condition.matchAll(/\(([^()]*)\)/g)].map((match) => match[1]?.trim() ?? "");
  for (const feature of features) {
    if (freeFeature.test(feature)) continue;
    if (!allowedSize.some((pattern) => pattern.test(feature))) {
      return `(${feature}) is not one of ADR 0010's values`;
    }
    const band = /^(\d+)rem\s*<=\s*width\s*<\s*(\d+)rem$/.exec(feature);
    if (band !== null && Number(band[1]) >= Number(band[2])) return `(${feature}) is an empty band`;
  }
  const rest = condition
    .replace(/\([^()]*\)/g, "")
    .replace(/\b(?:and|not|only|screen|print|all)\b|,/g, "");
  return rest.trim() === "" ? undefined : `"${rest.trim()}" is not a media query keyword`;
}

/** Every .astro and .css file under a folder. */
function styleFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return styleFiles(path);
    return /\.(?:astro|css)$/.test(entry.name) ? [path] : [];
  });
}

const src = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const files = styleFiles(src).map((path) => ({
  path: path.slice(src.length),
  text: readFileSync(path, "utf8"),
}));

describe("the media query check", () => {
  it.each([
    "(min-width: 48rem)",
    "(width >= 64rem)",
    "(width < 48rem)",
    "(48rem <= width < 64rem)",
    "(height < 45rem)",
    "(scripting: enabled) and (width >= 64rem) and (height < 45rem)",
    "screen and (prefers-reduced-motion: no-preference)",
    "(min-width: 80rem) and (pointer: fine)",
  ])("accepts %s", (condition) => {
    expect(mediaQueryProblem(condition)).toBeUndefined();
  });

  it.each([
    "(min-width: 40rem)",
    "(max-width: 767px)",
    "(max-width: 47.99rem)",
    "(min-height: 40rem)",
    "(max-height: 44.999rem)",
    "(width >= 1024px)",
    "(64rem <= width < 48rem)",
    "(orientation: portrait)",
  ])("rejects %s", (condition) => {
    expect(mediaQueryProblem(condition)).toBeDefined();
  });
});

describe("every style in src", () => {
  it("reads the styles", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("uses only ADR 0010's media query values", () => {
    const problems = files.flatMap(({ path, text }) =>
      [...text.matchAll(/@media\s+([^{]+)\{/g)].flatMap((match) => {
        const problem = mediaQueryProblem(match[1] ?? "");
        return problem === undefined ? [] : [`${path}: @media ${match[1]?.trim()}: ${problem}`];
      }),
    );
    expect(problems).toEqual([]);
  });

  it("gives every container query, in rem, a comment naming what stops fitting", () => {
    const problems = files.flatMap(({ path, text }) =>
      [...text.matchAll(/@container\b([^{]*)\{/g)].flatMap((match) => {
        const before = text.slice(0, match.index).trimEnd();
        const values = [...(match[1] ?? "").matchAll(/(\d*\.?\d+)([a-z%]+)/g)];
        const issues = [
          ...(before.endsWith("*/") ? [] : ["no comment before it"]),
          ...values
            .filter((value) => value[2] !== "rem")
            .map((value) => `${value[0]} is not in rem`),
        ];
        return issues.map((issue) => `${path}: @container${match[1]}: ${issue}`);
      }),
    );
    expect(problems).toEqual([]);
  });

  it("uses only Tailwind's md, lg and xl variants, which global.css sets to the three steps", () => {
    const global = files.find(({ path }) => path.endsWith("global.css"))?.text ?? "";
    expect(global).toMatch(/--breakpoint-\*:\s*initial;/);
    expect(
      [...global.matchAll(/--breakpoint-(\w+):\s*([^;]+);/g)].map((match) => [match[1], match[2]]),
    ).toEqual([
      ["md", "48rem"],
      ["lg", "64rem"],
      ["xl", "80rem"],
    ]);
    const variants = files.flatMap(({ path, text }) =>
      [
        ...text.matchAll(
          /(?<![\w-])(?:(?:max-|min-)?(?:sm|2xl)|(?:min|max)-\[[^\]]*\]|\[@media[^\]]*\]):/g,
        ),
      ].map((match) => `${path}: ${match[0]}`),
    );
    expect(variants).toEqual([]);
  });
});
