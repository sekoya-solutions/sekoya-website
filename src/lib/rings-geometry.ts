/**
 * The career's tree rings (#18): a trunk's cross-section in an SVG of
 * 800 × 800 units, centred on (400, 400). Each band is a position, the
 * oldest at the pith and the current one at the bark; one hairline inside a
 * band is one whole year in that position.
 *
 * Computed at build time, with no randomness: the same career always gives
 * the same drawing. The rings are not perfect circles: each edge is a closed
 * polyline whose radius wavers by about 1 %, by a sum of sines whose phase
 * depends on the ring, so no two edges look alike.
 */

/** The SVG's centre, in its units. */
export const centre = 400;

/** The pith's radius, then where the bands start. */
export const pithRadius = 30;
export const firstRadius = 34;

/** Where the past positions' bands end, and the current position's band, fixed. */
export const pastRadius = 350;
export const currentThickness = 22;

/** A past band's thickness before the bands are scaled to fill their space. */
export const minThickness = 64;
export const maxThickness = 130;

/** The years a position whose dates are still placeholders counts for, visibly. */
export const placeholderYears = 3;

/** The number of points of each ring's polyline. */
export const ringPoints = 120;

/** How much a ring's radius wavers, as a share of its radius. */
export const wobble = 0.012;

/** A position, as the rings need it, from the oldest to the most recent. */
export interface RingInput {
  /** Its duration in whole months; undefined while its dates are placeholders. */
  readonly months: number | undefined;
  /** Whether it is the current position, which must be the most recent. */
  readonly current: boolean;
}

/** A position's band, from the pith: its radii in the SVG's units. */
export interface Band {
  /** Its place from the pith, the oldest being 0. */
  readonly index: number;
  readonly inner: number;
  readonly outer: number;
  /** The radius halfway through the band, where its label and tooltip sit. */
  readonly middle: number;
  /** One radius per whole year in the position, evenly spaced inside the band. */
  readonly hairlines: readonly number[];
  /** Whether its thickness is the placeholder default, until its dates are provided. */
  readonly placeholder: boolean;
  readonly current: boolean;
}

/**
 * The bands of a career, from the pith outwards. A past band's thickness is
 * its share of the past years, kept between 64 and 130 units, then all are
 * scaled so they fill the space from 34 to 350; the current position, still
 * growing, is a fixed 22-unit band outside them. Only a finished position
 * has hairlines, one per whole year: the current one's years are not over.
 */
export function bands(inputs: readonly RingInput[]): Band[] {
  if (inputs.length === 0) throw new Error("A career has at least one position");
  inputs.forEach((input, index) => {
    if (input.current && index !== inputs.length - 1) {
      throw new Error("Only the most recent position can be the current one");
    }
    if (input.months !== undefined && (!Number.isInteger(input.months) || input.months <= 0)) {
      throw new Error(`A position lasts a positive whole number of months, not ${input.months}`);
    }
  });
  const past = inputs.filter((input) => !input.current);
  const years = past.map((input) => (input.months ?? placeholderYears * 12) / 12);
  const total = years.reduce((sum, value) => sum + value, 0);
  const span = pastRadius - firstRadius;
  const clamped = years.map((value) =>
    Math.min(maxThickness, Math.max(minThickness, (value / total) * span)),
  );
  const scale = span / clamped.reduce((sum, value) => sum + value, 0);

  const result: Band[] = [];
  let inner = firstRadius;
  inputs.forEach((input, index) => {
    const outer = input.current
      ? inner + currentThickness
      : // The last past band ends exactly at 350, whatever the rounding.
        index === past.length - 1
        ? pastRadius
        : inner + (clamped[index] ?? 0) * scale;
    const count = input.current
      ? 0
      : input.months === undefined
        ? placeholderYears
        : Math.floor(input.months / 12);
    result.push({
      index,
      inner,
      outer,
      middle: (inner + outer) / 2,
      hairlines: Array.from(
        { length: count },
        (_, line) => inner + ((outer - inner) * (line + 1)) / (count + 1),
      ),
      placeholder: !input.current && input.months === undefined,
      current: input.current,
    });
    inner = outer;
  });
  return result;
}

/** The phase of a band's outer edge; its inner edge is the previous band's outer one. */
export function edgePhase(index: number): number {
  return index * 1.3;
}

/** The phase of a band's hairline, from 0. */
export function hairlinePhase(index: number, line: number): number {
  return edgePhase(index) + (line + 1) * 0.4;
}

/** A ring's radius at an angle, in radians clockwise from 12 o'clock. */
export function radiusAt(radius: number, phase: number, angle: number): number {
  return (
    radius *
    (1 +
      wobble * Math.sin(2 * angle + phase) +
      0.6 * wobble * Math.sin(3 * angle + 1.7 * phase + 1) +
      0.35 * wobble * Math.sin(5 * angle + 0.6 * phase))
  );
}

/** A number with one decimal at most, as SVG path data writes it. */
function short(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** A ring's points, clockwise from 12 o'clock. */
export function ringPointsOf(radius: number, phase: number): [number, number][] {
  return Array.from({ length: ringPoints }, (_, point) => {
    const angle = (2 * Math.PI * point) / ringPoints;
    const r = radiusAt(radius, phase, angle);
    return [centre + r * Math.sin(angle), centre - r * Math.cos(angle)];
  });
}

/**
 * A ring as SVG path data: a closed polyline drawn clockwise from 12
 * o'clock, so a stroke that draws itself in goes round like a clock's hand.
 */
export function ringPath(radius: number, phase: number): string {
  const points = ringPointsOf(radius, phase).map(([x, y]) => `${short(x)} ${short(y)}`);
  return `M${points.join(" ")}Z`;
}

/**
 * A band's surface, between two rings, as SVG path data: filled with the
 * `evenodd` rule, only the space between them is painted and takes the
 * pointer.
 */
export function annulusPath(band: Band): string {
  return `${ringPath(band.outer, edgePhase(band.index))}${ringPath(band.inner, edgePhase(band.index - 1))}`;
}

/** When a band starts and ends drawing itself in, as shares of the scroll, oldest first. */
export interface DrawWindow {
  readonly start: number;
  readonly end: number;
}

/** How long each band takes to draw itself in, as a share of the scroll. */
export const drawLength = 0.35;

/** The share of the scroll from which the bark and the labels appear. */
export const lateStart = 0.92;

/**
 * The scroll share at which band `index` of `count` starts drawing itself in:
 * the oldest at once, each later one a step after, the last one ending just
 * after the bark starts to appear.
 */
export function drawWindow(index: number, count: number): DrawWindow {
  const start = index / (count + 1);
  return { start, end: start + drawLength };
}
