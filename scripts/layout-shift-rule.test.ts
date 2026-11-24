import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The one rule for layout shifts (#64): only e2e/layout-shift.ts observes
// them, so every end-to-end test applies the same allowance. A test that
// observes `layout-shift` entries itself, or names the entry type in any
// way, fails here.

const root = fileURLToPath(new URL("..", import.meta.url));
const e2e = join(root, "e2e");
const helper = "e2e/layout-shift.ts";

/** The entry type as a string, in any quotes; not a path such as `./layout-shift`. */
const entryType = /["'`]layout-shift["'`]/;

/** The files, as `path: line`, that observe layout shifts outside the helper. */
function layoutShiftViolations(files: readonly { path: string; text: string }[]): string[] {
  return files
    .filter(({ path }) => path !== helper)
    .flatMap(({ path, text }) =>
      text
        .split("\n")
        .flatMap((line, index) => (entryType.test(line) ? [`${path}:${index + 1}`] : [])),
    );
}

/** Every TypeScript file under a folder, with its path from the root. */
function filesIn(folder: string): { path: string; text: string }[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.[cm]?ts$/.test(entry.name))
    .map((entry) => {
      const full = join(entry.parentPath, entry.name);
      return { path: relative(root, full).replaceAll("\\", "/"), text: readFileSync(full, "utf8") };
    });
}

describe("the layout shift rule", () => {
  it("leaves the observing of layout shifts to the shared helper", () => {
    const files = filesIn(e2e);
    expect(files.map(({ path }) => path)).toContain(helper);
    expect(layoutShiftViolations(files)).toEqual([]);
  });

  it("finds a test that observes layout shifts itself", () => {
    const sample = [
      { path: helper, text: 'observer.observe({ type: "layout-shift" });' },
      {
        path: "e2e/sample.spec.ts",
        text: "const a = 1;\nobserver.observe({ type: 'layout-shift', buffered: true });",
      },
      { path: "e2e/other.spec.ts", text: "getEntriesByType(`layout-shift`)" },
      { path: "e2e/import.spec.ts", text: 'import { expectLayoutStable } from "./layout-shift";' },
    ];
    expect(layoutShiftViolations(sample)).toEqual(["e2e/sample.spec.ts:2", "e2e/other.spec.ts:1"]);
  });
});
