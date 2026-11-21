import { describe, expect, it } from "vitest";
import {
  annulusPath,
  bands,
  centre,
  currentThickness,
  drawWindow,
  edgePhase,
  firstRadius,
  pastRadius,
  placeholderYears,
  type RingInput,
  radiusAt,
  ringPath,
  ringPoints,
  ringPointsOf,
  wobble,
} from "./rings-geometry";

// The career's tree rings (#18): the bands' radii from the positions'
// durations, and the rings' outlines, computed at build time.

/** The career as the page has it, oldest first: two placeholders, then 05/2022 – 09/2025, then the current one. */
const career: RingInput[] = [
  { months: undefined, current: false },
  { months: undefined, current: false },
  { months: 40, current: false },
  { months: undefined, current: true },
];

describe("the bands", () => {
  it("are contiguous, from the first radius to the bark, with nothing between them", () => {
    const result = bands(career);
    expect(result[0]?.inner).toBe(firstRadius);
    for (let index = 1; index < result.length; index++) {
      expect(result[index]?.inner).toBe(result[index - 1]?.outer);
    }
    expect(result[2]?.outer).toBe(pastRadius);
    expect(result[3]).toMatchObject({ inner: pastRadius, outer: pastRadius + currentThickness });
  });

  it("give one hairline per whole year of a finished position, inside its band, evenly spaced", () => {
    const result = bands([
      { months: 11, current: false },
      { months: 12, current: false },
      { months: 40, current: false },
      { months: 100, current: false },
    ]);
    expect(result.map((band) => band.hairlines.length)).toEqual([0, 1, 3, 8]);
    for (const band of result) {
      const radii = [band.inner, ...band.hairlines, band.outer];
      const step = (band.outer - band.inner) / (band.hairlines.length + 1);
      for (let index = 1; index < radii.length; index++) {
        expect((radii[index] ?? 0) - (radii[index - 1] ?? 0)).toBeCloseTo(step);
      }
    }
  });

  it("give the current position, whose years are not over, no hairline", () => {
    expect(bands([{ months: 30, current: true }])[0]?.hairlines).toEqual([]);
  });

  it("count a position whose dates are placeholders for the default years, flagged", () => {
    const result = bands(career);
    expect(result.map((band) => band.placeholder)).toEqual([true, true, false, false]);
    expect(result[0]?.hairlines).toHaveLength(placeholderYears);
  });

  it("share the past space by years, each band kept between 64 and 130 units before scaling", () => {
    const even = bands([
      { months: 36, current: false },
      { months: 36, current: false },
    ]);
    expect(even[0]?.outer).toBeCloseTo((firstRadius + pastRadius) / 2);
    // One long position and one short one: the short one keeps the minimum
    // share, so a short position is still a band you can point at.
    const [long, short] = bands([
      { months: 240, current: false },
      { months: 6, current: false },
    ]);
    if (long === undefined || short === undefined) throw new Error("two bands expected");
    expect((short.outer - short.inner) / (long.outer - long.inner)).toBeCloseTo(64 / 130);
  });

  it("are the same for the same career: nothing is random", () => {
    expect(bands(career)).toEqual(bands(career));
    expect(bands(career).map(annulusPath)).toEqual(bands(career).map(annulusPath));
  });

  it("refuse a current position that is not the most recent, or a duration that is not positive", () => {
    expect(() =>
      bands([
        { months: undefined, current: true },
        { months: 12, current: false },
      ]),
    ).toThrow("most recent");
    expect(() => bands([{ months: 0, current: false }])).toThrow("positive");
    expect(() => bands([])).toThrow("at least one");
  });
});

describe("a ring's outline", () => {
  it("is a closed polyline of 120 points, starting at 12 o'clock and going clockwise", () => {
    const points = ringPointsOf(200, 0);
    expect(points).toHaveLength(ringPoints);
    const [first, second] = points;
    expect(first?.[0]).toBeCloseTo(centre);
    expect(first?.[1]).toBeLessThan(centre);
    // Clockwise on screen: from 12 o'clock, the next point is to the right.
    expect(second?.[0]).toBeGreaterThan(centre);
    const path = ringPath(200, 0);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.slice(1, -1).split(" ")).toHaveLength(ringPoints * 2);
  });

  it("wavers around its radius by the formula's amplitude at most", () => {
    const limit = 1 + wobble * (1 + 0.6 + 0.35);
    for (const [x, y] of ringPointsOf(300, edgePhase(2))) {
      const distance = Math.hypot(x - centre, y - centre);
      expect(distance).toBeLessThanOrEqual(300 * limit + 1e-9);
      expect(distance).toBeGreaterThanOrEqual(300 * (2 - limit) - 1e-9);
    }
  });

  it("follows the formula r(θ) = r · (1 + a·sin(2θ+φ) + 0.6a·sin(3θ+1.7φ+1) + 0.35a·sin(5θ+0.6φ))", () => {
    const phase = 1.3;
    const angle = 0.7;
    expect(radiusAt(100, phase, angle)).toBeCloseTo(
      100 *
        (1 +
          wobble * Math.sin(2 * angle + phase) +
          0.6 * wobble * Math.sin(3 * angle + 1.7 * phase + 1) +
          0.35 * wobble * Math.sin(5 * angle + 0.6 * phase)),
      12,
    );
  });

  it("differs from one ring to the next", () => {
    expect(ringPath(200, edgePhase(1))).not.toBe(ringPath(200, edgePhase(2)));
  });

  it("makes a band's surface from its outer edge and the previous band's outer edge", () => {
    const [first, second] = bands(career);
    if (first === undefined || second === undefined) throw new Error("bands expected");
    expect(annulusPath(second)).toBe(
      `${ringPath(second.outer, edgePhase(1))}${ringPath(first.outer, edgePhase(0))}`,
    );
  });
});

describe("the drawing on scroll", () => {
  it("starts each band a step after the previous one, the last ending before the bark", () => {
    const windows = [0, 1, 2, 3].map((index) => drawWindow(index, 4));
    [0, 0.2, 0.4, 0.6].forEach((start, index) => {
      expect(windows[index]?.start).toBeCloseTo(start);
      expect((windows[index]?.end ?? 0) - start).toBeCloseTo(0.35);
    });
    expect(windows[3]?.end).toBeLessThan(0.96);
  });
});
