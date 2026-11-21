/**
 * The career rings' script (ADR 0005, #18), inlined after the rings, on the
 * career page only. The page is complete without it: with no scripting, CSS
 * shows the vertical timeline instead of the rings.
 *
 * - Pointing at a band (with a mouse) shows its tooltip at the nearest point
 *   of the band; focusing it shows the tooltip too. Escape hides it.
 * - A click, a tap, Enter or Space on a band or a legend item pins it: the
 *   panel shows that position. On a narrow stage, where the panel sits under
 *   the rings, the panel scrolls into view.
 * - The arrow keys move the focus to the neighbouring band: up and right
 *   outwards, to the more recent one; down and left inwards.
 * - Where CSS scroll-driven animations are missing, the script writes the
 *   scroll progress (`--career-p`) that CSS derives the drawing from; where
 *   they exist, or under reduced motion, it leaves the drawing to CSS.
 * - While the rings are shown, the timeline, kept for screen readers, is
 *   visually hidden: its summaries leave the Tab order, so the focus never
 *   lands on something unseen.
 *
 * The functions are inlined by their source, so each uses nothing outside its
 * own body and its arguments. The page's policy allows the script by its
 * hash (ADR 0002). CSS draws every state; the script only sets attributes,
 * classes and, through the CSS object model, which the policy allows, the
 * tooltip's position and the scroll progress.
 */
import { createHash } from "node:crypto";

/** The media queries the script shares with Career.astro's styles. */
export interface CareerQueries {
  /** Where the rings are shown, and the timeline only kept for screen readers. */
  rings: string;
  /** Where the panel sits under the rings. */
  stacked: string;
  /** Where the rings draw themselves in as the page scrolls. */
  drawing: string;
}

export const careerQueries: CareerQueries = {
  rings: "(min-width: 48rem)",
  stacked: "(max-width: 63.999rem)",
  drawing: "(min-width: 80rem) and (min-height: 40rem) and (prefers-reduced-motion: no-preference)",
};

/**
 * The drawing's progress, from 0 to 1, while a track of `height` pixels,
 * whose top is `top` pixels from the viewport's top, scrolls through a
 * viewport of `viewport` pixels: 0 when its top reaches the viewport's top, 1
 * when its bottom reaches the viewport's bottom, as CSS's `contain` range of
 * a view timeline. A track no taller than the viewport is fully drawn.
 */
export function drawProgress(top: number, height: number, viewport: number): number {
  const span = height - viewport;
  return span > 0 ? Math.min(1, Math.max(0, -top / span)) : 1;
}

/** The angle at which a band's tooltip shows on focus, clockwise from 12 o'clock: 62°. */
export const focusAngle = (62 * Math.PI) / 180;

function careerRings(
  queries: CareerQueries,
  progress: typeof drawProgress,
  angleOnFocus: number,
): void {
  const root = document.querySelector<HTMLElement>("[data-career]");
  const svg = root?.querySelector("svg[data-rings]");
  const figure = svg?.parentElement;
  const panel = root?.querySelector<HTMLElement>("#career-panel");
  if (!root || !svg || !figure || !panel) return;
  const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
  const bands = all("path[data-select]");
  const choosers = all("[data-select]");
  const marked = all("[data-ring]");
  const stacked = matchMedia(queries.stacked);

  const mark = (slug: string | undefined, name: string) => {
    for (const element of marked) element.classList.toggle(name, element.dataset.ring === slug);
  };

  const pin = (slug: string | undefined) => {
    for (const chooser of choosers) {
      chooser.setAttribute("aria-pressed", String(chooser.dataset.select === slug));
    }
    for (const view of all("[data-panel]")) view.hidden = view.dataset.panel !== slug;
    mark(slug, "pinned");
    if (stacked.matches) panel.scrollIntoView({ block: "nearest" });
  };

  const show = (band: HTMLElement | undefined, angle = angleOnFocus) => {
    const slug = band?.dataset.select;
    mark(slug, "hot");
    for (const tip of all("[data-tip]")) {
      tip.hidden = tip.dataset.tip !== slug;
      if (tip.hidden || band === undefined) continue;
      const box = svg.getBoundingClientRect();
      const base = figure.getBoundingClientRect();
      const radius = (Number(band.dataset.r) / 800) * box.width;
      tip.style.left = `${box.left - base.left + box.width / 2 + radius * Math.sin(angle)}px`;
      tip.style.top = `${box.top - base.top + box.height / 2 - radius * Math.cos(angle)}px`;
    }
  };

  bands.forEach((band, index) => {
    band.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const box = svg.getBoundingClientRect();
      show(
        band,
        Math.atan2(
          event.clientX - box.left - box.width / 2,
          box.top + box.height / 2 - event.clientY,
        ),
      );
    });
    band.addEventListener("pointerleave", () => show(undefined));
    band.addEventListener("focus", () => show(band));
    band.addEventListener("blur", () => show(undefined));
    band.addEventListener("keydown", (event) => {
      // The bands are listed the most recent first: outwards is backwards.
      const step = { ArrowUp: -1, ArrowRight: -1, ArrowDown: 1, ArrowLeft: 1 }[event.key];
      if (event.key === "Enter" || event.key === " ") pin(band.dataset.select);
      else if (step !== undefined) bands[index + step]?.focus();
      else return;
      event.preventDefault();
    });
  });
  for (const chooser of choosers) {
    chooser.addEventListener("click", () => pin(chooser.dataset.select));
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") show(undefined);
  });

  const rings = matchMedia(queries.rings);
  const syncTimeline = () => {
    for (const summary of all("summary")) {
      if (rings.matches) summary.tabIndex = -1;
      else summary.removeAttribute("tabindex");
    }
  };
  rings.addEventListener("change", syncTimeline);
  syncTimeline();

  if (CSS.supports("animation-timeline: view()")) return;
  const stage = root.querySelector<HTMLElement>("[data-career-stage]");
  if (!stage) return;
  const drawing = matchMedia(queries.drawing);
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!drawing.matches) {
      stage.style.removeProperty("--career-p");
      return;
    }
    const box = stage.getBoundingClientRect();
    stage.style.setProperty("--career-p", String(progress(box.top, box.height, innerHeight)));
  };
  const request = () => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  drawing.addEventListener("change", request);
  update();
}

/** The inline script's source. */
export const careerRingsScript = `(${careerRings.toString()})(${JSON.stringify(careerQueries)},${drawProgress.toString()},${focusAngle});`;

/** The CSP source of the <script> element holding exactly `careerRingsScript`. */
export const careerRingsHash =
  `sha256-${createHash("sha256").update(careerRingsScript).digest("base64")}` as const;
