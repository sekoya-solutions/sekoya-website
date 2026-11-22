/**
 * The career rings' script (ADR 0005, #18), inlined after the rings, on the
 * career page only. The page is complete without it: with no scripting, CSS
 * shows the vertical timeline instead of the rings.
 *
 * - Pointing at a band (with a mouse) shows its tooltip at the nearest point
 *   of the band; focusing it shows the tooltip too. Escape hides it.
 * - A click, a tap, Enter or Space on a band or a legend item pins it: the
 *   panel shows that position.
 * - The arrow keys move the focus to the neighbouring band: up and right
 *   outwards, to the more recent one; down and left inwards.
 * - The rings draw themselves in once (ADR 0010): the script marks the stage
 *   `data-draw="pending"` as it starts, and `run` once the stage's top has
 *   come a fifth of the screen into view (an intersection observer), and CSS
 *   animates the drawing. Under reduced motion CSS ignores both, and the
 *   rings are drawn in full. Where the observer is missing, the stage is
 *   marked `run` at once.
 * - While the rings are shown, the timeline, kept for screen readers, is
 *   visually hidden: its summaries leave the Tab order, so the focus never
 *   lands on something unseen.
 *
 * The function is inlined by its source, so it uses nothing outside its own
 * body and its arguments. The page's policy allows the script by its hash
 * (ADR 0002). CSS draws every state; the script only sets attributes,
 * classes and, through the CSS object model, which the policy allows, the
 * tooltip's position.
 */
import { createHash } from "node:crypto";

/** Where the rings are shown, and the timeline only kept for screen readers (Career.astro). */
export const ringsQuery = "(width >= 64rem)";

/** The angle at which a band's tooltip shows on focus, clockwise from 12 o'clock: 62°. */
export const focusAngle = (62 * Math.PI) / 180;

function careerRings(query: string, angleOnFocus: number): void {
  const root = document.querySelector<HTMLElement>("[data-career]");
  const svg = root?.querySelector("svg[data-rings]");
  const figure = svg?.parentElement;
  const stage = root?.querySelector<HTMLElement>("[data-career-stage]");
  if (!root || !svg || !figure || !stage) return;
  const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
  const bands = all("path[data-select]");
  const choosers = all("[data-select]");
  const marked = all("[data-ring]");

  // The drawing waits until the stage comes into view, then runs once.
  if ("IntersectionObserver" in window) {
    stage.dataset.draw = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        stage.dataset.draw = "run";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(stage);
  } else stage.dataset.draw = "run";

  const mark = (slug: string | undefined, name: string) => {
    for (const element of marked) element.classList.toggle(name, element.dataset.ring === slug);
  };

  const pin = (slug: string | undefined) => {
    for (const chooser of choosers) {
      chooser.setAttribute("aria-pressed", String(chooser.dataset.select === slug));
    }
    for (const view of all("[data-panel]")) view.hidden = view.dataset.panel !== slug;
    mark(slug, "pinned");
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
      // The bands are listed from the pith outwards.
      const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
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

  const rings = matchMedia(query);
  const syncTimeline = () => {
    for (const summary of all("summary")) {
      if (rings.matches) summary.tabIndex = -1;
      else summary.removeAttribute("tabindex");
    }
  };
  rings.addEventListener("change", syncTimeline);
  syncTimeline();
}

/** The inline script's source. */
export const careerRingsScript = `(${careerRings.toString()})(${JSON.stringify(ringsQuery)},${focusAngle});`;

/** The CSP source of the <script> element holding exactly `careerRingsScript`. */
export const careerRingsHash =
  `sha256-${createHash("sha256").update(careerRingsScript).digest("base64")}` as const;
