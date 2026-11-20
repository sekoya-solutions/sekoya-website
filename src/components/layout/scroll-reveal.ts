/**
 * The scroll reveal's fallback script (ADR 0005), for browsers without CSS
 * scroll-driven animations (global.css): it adds `in` to each `.reveal` and
 * `.reveal-draw` element as it enters the viewport. It does nothing where CSS
 * does the work, under reduced motion, or without IntersectionObserver.
 *
 * Elements already in the viewport are marked before the root gets
 * `reveal-js`, which is what enables the hidden state: what is on screen at
 * load never blinks out, and if the script never runs, nothing is hidden.
 *
 * The function is inlined by its source, so it must use nothing outside its
 * own body. The page's policy allows it by its hash (ADR 0002).
 */
import { createHash } from "node:crypto";

function revealOnScroll(): void {
  if (
    CSS.supports("animation-timeline: view()") ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  ) {
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    }
  });
  for (const element of document.querySelectorAll(".reveal, .reveal-draw")) {
    if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add("in");
    else observer.observe(element);
  }
  document.documentElement.classList.add("reveal-js");
}

/** The inline script's source. */
export const scrollRevealScript = `(${revealOnScroll.toString()})();`;

/** The CSP source of the <script> element holding exactly `scrollRevealScript`. */
export const scrollRevealHash =
  `sha256-${createHash("sha256").update(scrollRevealScript).digest("base64")}` as const;
