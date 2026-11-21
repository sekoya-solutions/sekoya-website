import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { careerRingsHash, careerRingsScript, drawProgress } from "./career-rings";

// The career rings' inline script (#18). Its behaviour in the browser, which
// needs a real layout, is covered by e2e/career.spec.ts; here, its scroll
// progress where CSS scroll-driven animations are missing, and its hash.

describe("the drawing's progress on scroll", () => {
  const viewport = 800;
  const height = 3 * viewport;

  it("is 0 until the track's top reaches the viewport's top", () => {
    expect(drawProgress(300, height, viewport)).toBe(0);
    expect(drawProgress(0, height, viewport)).toBe(0);
  });

  it("grows with the scroll, as CSS's contain range does", () => {
    expect(drawProgress(-800, height, viewport)).toBe(0.5);
    expect(drawProgress(-1600, height, viewport)).toBe(1);
  });

  it("is 1 once the track's bottom has passed the viewport's bottom", () => {
    expect(drawProgress(-2000, height, viewport)).toBe(1);
  });

  it("is 1 for a track no taller than the viewport", () => {
    expect(drawProgress(0, viewport, viewport)).toBe(1);
    expect(drawProgress(-10, 400, viewport)).toBe(1);
  });
});

describe("the inline script", () => {
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
