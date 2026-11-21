import { describe, expect, it } from "vitest";
import { ghostSpan } from "./portfolio-grid";

describe("ghostSpan", () => {
  it("fills what is left of the last row", () => {
    // The portfolio at launch: a wide card, then two narrow ones.
    expect(ghostSpan([2, 1, 1], 3)).toBe(2);
    expect(ghostSpan([1], 3)).toBe(2);
    expect(ghostSpan([1, 1], 3)).toBe(1);
    expect(ghostSpan([1], 2)).toBe(1);
  });

  it("is 0 when the last row is full, so the ghost card is not shown", () => {
    expect(ghostSpan([2, 1, 1], 2)).toBe(0);
    expect(ghostSpan([2, 1, 1, 1, 1], 3)).toBe(0);
    expect(ghostSpan([1, 1, 1], 3)).toBe(0);
    expect(ghostSpan([], 3)).toBe(0);
  });

  it("shrinks as projects are added, then disappears", () => {
    expect(
      [2, 1, 1, 1, 1].map((_, count, spans) => ghostSpan(spans.slice(0, count + 1), 3)),
    ).toEqual([1, 0, 2, 1, 0]);
  });

  it("starts a card too wide for the rest of a row on the next row, as CSS does", () => {
    // Row 1: two narrow cards and a gap; row 2: the wide card, then one cell.
    expect(ghostSpan([1, 1, 2], 3)).toBe(1);
    expect(ghostSpan([1, 2], 2)).toBe(0);
  });

  it("clamps a span to the grid's width, as CSS does", () => {
    expect(ghostSpan([2, 1, 1], 1)).toBe(0);
    expect(ghostSpan([1, 2], 1)).toBe(0);
  });

  it("rejects a span or a column count that is not a whole, positive number", () => {
    expect(() => ghostSpan([0], 3)).toThrow("not 0");
    expect(() => ghostSpan([1.5], 3)).toThrow("not 1.5");
    expect(() => ghostSpan([1], 0)).toThrow("not 0");
  });
});
