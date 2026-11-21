/**
 * The playable demo's facade (ADR 0005): a poster with a play button, which
 * is a plain link to the demo, so the page works without JavaScript. On a
 * desktop browser (from 1024 px wide, with a mouse), a click replaces the
 * poster with the demo in an iframe, so its download starts only then.
 * Elsewhere, CSS hides the button and shows a notice with a link
 * (DemoFacade.astro), and the script never adds the iframe.
 *
 * A click with a modifier key, or with another button than the main one,
 * keeps the link's own behaviour (a new tab, a download).
 *
 * The function is inlined by its source, so it must use nothing outside its
 * own body. The page's policy allows it by its hash (ADR 0002), and allows
 * frames from the demo's origin only (DemoFacade.astro).
 */
import { createHash } from "node:crypto";

/**
 * Where the demo can be played: the same media query as DemoFacade.astro's
 * styles, which show the play button there and the notice elsewhere.
 */
export const desktopQuery = "(min-width: 64rem) and (pointer: fine)";

function loadDemoOnClick(query: string): void {
  const desktop = matchMedia(query);
  for (const play of document.querySelectorAll<HTMLAnchorElement>("a[data-demo-play]")) {
    play.addEventListener("click", (event) => {
      if (
        !desktop.matches ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const frame = play.closest("[data-demo-frame]");
      if (frame === null) return;
      event.preventDefault();
      const iframe = document.createElement("iframe");
      iframe.src = play.href;
      iframe.title = play.dataset.demoTitle ?? "";
      iframe.allow = "fullscreen; autoplay";
      iframe.className = "demo-iframe";
      frame.replaceChildren(iframe);
      iframe.focus();
    });
  }
}

/** The inline script's source. */
export const demoFacadeScript = `(${loadDemoOnClick.toString()})(${JSON.stringify(desktopQuery)});`;

/** The CSP source of the <script> element holding exactly `demoFacadeScript`. */
export const demoFacadeHash =
  `sha256-${createHash("sha256").update(demoFacadeScript).digest("base64")}` as const;
