/**
 * What the career page (#18) shows of each position, computed at build time
 * from its content (src/content/career): its period, duration and ring
 * number in words, its band's geometry (src/lib/rings-geometry.ts), and when
 * it draws itself in.
 *
 * Each band's drawing window and shade go into a small generated style sheet,
 * one rule per position, which the page inlines with its hash in the page's
 * policy (ADR 0002): an inline `style` attribute would need 'unsafe-inline'.
 */
import { createHash } from "node:crypto";
import {
  fill,
  formatDuration,
  formatPeriod,
  monthsBetween,
  numericMonth,
  parseMonth,
  type UnitWords,
} from "../../lib/career";
import {
  annulusPath,
  type Band,
  bands,
  currentLinePhase,
  type DrawWindow,
  drawLength,
  drawWindow,
  edgePhase,
  hairlinePhase,
  lateStart,
  ringPath,
} from "../../lib/rings-geometry";

/** A position as the content writes it. */
export interface PositionContent {
  slug: string;
  company: string;
  role: string;
  summary: string;
  start: string;
  end: string | null;
  highlights: string[];
  stack: string[];
  caseStudy?: string | undefined;
}

/** The labels the view fills. */
export interface CareerLabels {
  ringNumber: string;
  ringName: string;
  period: string;
  since: string;
  present: string;
  years: UnitWords;
  months: UnitWords;
}

/** A position as the page shows it. */
export interface PositionView extends PositionContent {
  /** As shown: `05/2022 – 09/2025`. */
  period: string;
  /** The band's accessible name: company, role and period read aloud. */
  name: string;
  /** In words, for a finished position whose dates are known. */
  duration: string | undefined;
  /** Its place from the pith, in words. */
  ringNumber: string;
  current: boolean;
  band: Band;
  draw: DrawWindow;
  /** From 0 for the oldest past band to 1 for the most recent, for its shade. */
  shade: number;
  paths: { surface: string; outer: string; inner: string; middle: string; hairlines: string[] };
}

/** The months a position lasted, when both its dates are known and it is over. */
function monthsOf(position: PositionContent): number | undefined {
  if (position.end === null) return undefined;
  const start = parseMonth(position.start);
  const end = parseMonth(position.end);
  return start === undefined || end === undefined ? undefined : monthsBetween(start, end);
}

/** The positions as the page shows them, the most recent first, as the content lists them. */
export function careerView(
  positions: readonly PositionContent[],
  labels: CareerLabels,
  locale: string,
): PositionView[] {
  const oldestFirst = [...positions].reverse();
  const geometry = bands(
    oldestFirst.map((position) => ({ months: monthsOf(position), current: position.end === null })),
  );
  const pastCount = geometry.filter((band) => !band.current).length;
  const views = oldestFirst.map((position, index): PositionView => {
    const band = geometry[index];
    if (band === undefined) throw new Error("A band per position expected");
    const months = monthsOf(position);
    const start = numericMonth(position.start);
    const spoken =
      position.end === null
        ? fill(labels.since, { start })
        : fill(labels.period, { start, end: numericMonth(position.end) });
    return {
      ...position,
      period: formatPeriod(position.start, position.end, labels.present),
      name: fill(labels.ringName, {
        company: position.company,
        role: position.role,
        period: spoken,
      }),
      duration: months === undefined ? undefined : formatDuration(months, locale, labels),
      ringNumber: fill(labels.ringNumber, { n: index + 1 }),
      current: band.current,
      band,
      draw: drawWindow(index, geometry.length),
      shade: pastCount > 1 ? Math.min(1, index / (pastCount - 1)) : 1,
      paths: {
        surface: annulusPath(band),
        outer: ringPath(band.outer, edgePhase(index)),
        inner: ringPath(band.inner, edgePhase(index - 1)),
        middle: ringPath(band.middle, currentLinePhase(index)),
        hairlines: band.hairlines.map((radius, line) =>
          ringPath(radius, hairlinePhase(index, line)),
        ),
      },
    };
  });
  return views.reverse();
}

/** A number for CSS, with four decimals at most. */
function cssNumber(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

/**
 * The style sheet that gives each position's elements (`[data-ring]`) when
 * they draw themselves in (`--ring-start`) and their shade (`--ring-shade`).
 */
export function ringStyles(views: readonly PositionView[]): string {
  const shared = `.career{--ring-length:${cssNumber(drawLength)};--ring-late:${cssNumber(lateStart)}}`;
  return (
    shared +
    views
      .map(
        (view) =>
          `.career [data-ring="${view.slug}"]{--ring-start:${cssNumber(view.draw.start)};--ring-shade:${cssNumber(view.shade)}}`,
      )
      .join("")
  );
}

/** The CSP source of the <style> element holding exactly `css`. */
export function styleHash(css: string): `sha256-${string}` {
  return `sha256-${createHash("sha256").update(css).digest("base64")}`;
}
