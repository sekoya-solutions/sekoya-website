import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("gives the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("does not depend on the order of the colours", () => {
    expect(contrastRatio("#22c08a", "#0a1d24")).toBe(contrastRatio("#0a1d24", "#22c08a"));
  });

  it("matches a known ratio", () => {
    // #767676 on white is the classic 4.54:1 pair.
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("rejects a value that is not #rrggbb", () => {
    expect(() => contrastRatio("red", "#ffffff")).toThrow();
  });
});
