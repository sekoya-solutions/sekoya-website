import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { careerRingsHash, careerRingsScript, ringsQuery } from "./career-rings";

// The career rings' inline script (#18). Its behaviour in the browser, which
// needs a real layout, is covered by e2e/career.spec.ts; here, that it shares
// its media query with the page's styles, and its hash.

describe("the inline script", () => {
  it("shows the rings where the page's styles do", () => {
    const styles = readFileSync(new URL("./Career.astro", import.meta.url), "utf8");
    expect(styles).toContain(`@media (scripting: enabled) and ${ringsQuery} {`);
  });

  it("is valid JavaScript that uses nothing outside its source", () => {
    expect(() => new Function(careerRingsScript)).not.toThrow();
  });

  it("does nothing on a page without the rings", () => {
    const global = globalThis as { document?: unknown };
    const before = global.document;
    global.document = { querySelector: () => null };
    try {
      expect(() => new Function(careerRingsScript)()).not.toThrow();
    } finally {
      global.document = before;
    }
  });

  it("is allowed by the hash of its exact source", () => {
    expect(careerRingsHash).toBe(
      `sha256-${createHash("sha256").update(careerRingsScript).digest("base64")}`,
    );
  });
});
