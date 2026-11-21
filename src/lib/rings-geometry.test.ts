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
  type RingLine,
  radiusAt,
  ringLines,
  ringPath,
  ringPoints,
  ringPointsOf,
  ringVariation,
  trunkPhase,
  trunkShape,
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
  it("passes through 48 points, starting at 12 o'clock and going clockwise", () => {
    const points = ringPointsOf(200, 0);
    expect(points).toHaveLength(ringPoints);
    const [first, second] = points;
    expect(first?.[0]).toBeCloseTo(centre);
    expect(first?.[1]).toBeLessThan(centre);
    // Clockwise on screen: from 12 o'clock, the next point is to the right.
    expect(second?.[0]).toBeGreaterThan(centre);
  });

  it("is a smooth closed curve: one cubic Bézier span per point, back to the start", () => {
    const path = ringPath(200, 0);
    expect(path).toMatch(/^M[\d.]+ [\d.]+C/);
    expect(path.endsWith("Z")).toBe(true);
    const numbers = path.slice(1, -1).replace("C", " ").split(" ");
    // The start, then three points (two controls and an end) per span.
    expect(numbers).toHaveLength(2 + ringPoints * 3 * 2);
    // The last span ends where the curve starts.
    expect(numbers.slice(-2)).toEqual(numbers.slice(0, 2));
  });

  it("follows the trunk's shared shape, plus a variation of its own of fixed size", () => {
    const angle = 0.7;
    const phase = trunkPhase;
    const shape =
      wobble *
      (Math.sin(2 * angle + phase) +
        0.6 * Math.sin(3 * angle + 1.7 * phase + 1) +
        0.35 * Math.sin(5 * angle + 0.6 * phase));
    expect(trunkShape(angle)).toBeCloseTo(shape, 12);
    expect(radiusAt(100, 1.3, angle)).toBeCloseTo(
      100 * (1 + shape) + ringVariation * Math.sin(4 * angle + 1.3),
      12,
    );
    for (const [x, y] of ringPointsOf(300, edgePhase(2))) {
      const angleHere = Math.atan2(x - centre, centre - y);
      const distance = Math.hypot(x - centre, y - centre);
      expect(Math.abs(distance - 300 * (1 + trunkShape(angleHere)))).toBeLessThanOrEqual(
        ringVariation + 1e-9,
      );
    }
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

describe("the gaps between neighbouring lines", () => {
  /** The narrowest and widest gap between two lines, all round the trunk. */
  function gapRange(inner: RingLine, outer: RingLine): [number, number] {
    let narrowest = Number.POSITIVE_INFINITY;
    let widest = 0;
    for (let step = 0; step < 720; step++) {
      const angle = (2 * Math.PI * step) / 720;
      const gap =
        radiusAt(outer.radius, outer.phase, angle) - radiusAt(inner.radius, inner.phase, angle);
      narrowest = Math.min(narrowest, gap);
      widest = Math.max(widest, gap);
    }
    return [narrowest, widest];
  }

  const careers: [string, RingInput[]][] = [
    ["the page's career", career],
    [
      "a long career with many hairlines",
      [
        { months: 150, current: false },
        { months: 30, current: false },
        { months: 96, current: false },
        { months: undefined, current: true },
      ],
    ],
  ];

  it.each(careers)("stay even all round the trunk, for %s, so no two lines touch", (_, input) => {
    const lines = ringLines(bands(input));
    for (let index = 1; index < lines.length; index++) {
      const inner = lines[index - 1];
      const outer = lines[index];
      if (inner === undefined || outer === undefined) throw new Error("lines expected");
      const [narrowest, widest] = gapRange(inner, outer);
      const nominal = outer.radius - inner.radius;
      // Never closer than 70 % of the drawn gap, nor wider than 130 %, and
      // never under 3 units: the lines run parallel.
      expect(
        narrowest,
        `${inner.kind} ${inner.radius} → ${outer.kind} ${outer.radius}`,
      ).toBeGreaterThan(Math.max(3, nominal * 0.7));
      expect(widest).toBeLessThan(nominal * 1.3);
    }
  });

  it("include the current band's dashed line and the bark's inner side", () => {
    expect(ringLines(bands(career)).map((line) => line.kind)).toEqual(
      expect.arrayContaining(["current", "bark"]),
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
