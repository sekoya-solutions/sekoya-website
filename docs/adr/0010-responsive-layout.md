# ADR 0010: Responsive layout

- Status: Accepted
- Date: 2026-11-22
- Deciders: Owner

## Context

Layout bugs keep appearing at widths and heights no test visits (a range of a few dozen pixels, a 1600 × 900 screen), and each fix so far has added a rule for that range. The forces:

- **Widths in use today:** 48, 64 and 80 rem (768, 1024 and 1280 CSS pixels), plus four one-off values (`40rem`, `767px`, `47.99rem` and the career page's `44.999rem` height).
- **Heights matter as much as widths:** the page gets the screen minus the taskbar and the browser's bars. A 1600 × 900 screen leaves about 1600 × 770; a 1920 × 1080 laptop at 150 % zoom leaves about 1280 × 600.
- **The career page's scroll-pinned stage** (a 300 vh track holding the rings on screen) is the most fragile layout of the site: it depends on width, height and motion settings, and it changed how the page reaches its footer (#51).
- **Tests check a few fixed sizes only:** the desktop and mobile Playwright projects and some sizes per page.
- **Budgets and rules stay:** the CSS budget (ADR 0003), the JavaScript budgets and the "complete without JavaScript" rule (ADR 0005).
- **CSS variables cannot be used in a media query,** so an allowed list of values is enforced by a test, not by tokens.

## Options considered

### Width steps

1. **Three layouts, with steps at 768 and 1200 px.** Pros: fewest steps. Cons: every two-column layout now at 1024 px is redesigned; the 1200 px container with its 40 px gutters does not fit a 1200 px screen.
2. **The steps the site already uses, 48, 64 and 80 rem, as the only ones allowed, checked by a test.** Pros: no redesign; rem values follow the visitor's font size. Cons: four layouts instead of three (80 rem is for the header's full navigation and wide-screen extras only).

### Between the steps

1. **Fluid by default:** `clamp()` for type and spacing, `minmax()`, `auto-fit` and `flex-wrap` in layouts, `max-width` rather than a fixed width on a layout block, and container queries for a component that adapts to the room its parent gives it (cards, the career panel, the rings). Pros: nothing to catch between two steps. Cons: some components need rewriting.
2. **Fix each range as it breaks.** Pros: quick. Cons: the current situation.

### Career stage

1. **Keep the scroll-pinned track.** Pros: the current design. Cons: the fragility above.
2. **No pinning: the rings draw themselves once, when they come into view, then the visitor hovers, taps or uses the keyboard on them; the page scrolls normally.** Pros: a normal scroll to the footer, simpler to test. Cons: the drawing no longer follows the scroll.

### Career page below 1024 px

1. **The rings with the panel stacked under them, from 768 px.** Pros: the rings show on tablets. Cons: the panel is off screen while the visitor picks a ring; one more layout.
2. **The vertical timeline below 1024 px.** Pros: one layout fewer; the timeline already exists for phones and for pages without JavaScript. Cons: tablets in portrait do not show the rings.

### Testing

1. **Fixed sizes only.** Cons: misses what lies between them.
2. **Fixed reference sizes plus a width sweep:** on each page, Playwright widens the viewport step by step and checks the layout at every width. Pros: finds a broken range without a test written for it. Cons: CI time.
3. **Screenshot comparisons.** Cons: font rendering differs between Windows and the Linux runners, so baselines must be made in CI; noisy while pages still change. Not now.

## Decision

Chosen: **width steps 2, fluid by default (between the steps 1), career stage 2, the timeline below 1024 px (career page 2), and testing 2.**

- **Allowed media queries:** widths 48, 64 and 80 rem and one height, 45 rem (720 px), in range syntax: `width >= 48rem` (or `min-width`) mobile first, `width < 48rem` where hiding or adjusting below a step is cleaner, a band between two of these values such as `48rem <= width < 64rem`, and `height < 45rem` for a compact mode on short screens. `>=` and `<` on the same value cover every width exactly once, so no `767px` or `47.99rem` is ever needed. Preference and capability queries (`prefers-reduced-motion`, `scripting`, `hover`, `pointer`) are free. A unit test reads every style in `src` and fails on any other media query value.
- **Container queries:** a component's own values, in rem, each with a comment naming what stops fitting at that width. The "no range fixes" rule applies to them too, and the sweep checks them like any other layout.
- **No range fixes:** a layout that breaks between two steps is fixed by making the component fluid, never by a rule for that range.
- **Viewport units:** `dvh` (or `svh`) rather than `vh` for anything sized on the screen's height.
- **Content width:** a page's content is never wider than the header's container (`--container`, 1200 px, inside the gutters), so every page lines up with the logo and the navigation. Only backgrounds and decorative scenes may run to the screen's edges. A test checks it on every page.
- **The career page:** from 1024 px with scripting, the rings and the panel, the ring sized on both the width and the height (`min(…, 100%, calc(100dvh - …))`); below 1024 px, or without JavaScript, the vertical timeline. This replaces ADR 0005's "scroll progress drives the drawing of the rings": the rings draw once, on entering the screen.
- **Reference sizes**, as the browser's viewport (the page area, not the screen): 320 × 568, 360 × 740, 390 × 664 (Playwright's iPhone), 768 × 1024, 1024 × 768, 1280 × 600, 1366 × 650, 1440 × 800, 1536 × 730, 1600 × 770 (a 1600 × 900 screen) and 1920 × 950.
- **The sweep:** widths from 320 to 1920 px, at heights from 600 to 950. Every pull request that changes code runs it, never only on a schedule, and every run keeps: every page template, in French and English; each step's value and one pixel below it; and the 600 px height. #54 measures the run and sets the width step (16 or 32 px), the other heights and whether pages sharing a template (case studies, projects) are all visited, within a budget of 5 minutes added to CI. At every width: no horizontal scroll on the page; no visible element beyond the viewport's sides outside a scroll container; no clipped text (an element that hides its overflow and whose content is wider or taller than its box); and the regions a page marks as side by side (such as the rings, the panel and the legend) do not overlap. Each width is checked once the layout has settled after the resize, never after a fixed delay.
- **Done means swept:** a page or component is finished only when the sweep passes on it.

## Consequences

Positive:

- One known set of layouts, and a test that finds what breaks between them.
- The career page loses its two most fragile modes and scrolls normally.

Negative:

- The sweep adds CI time, up to the 5 minute budget; a coarser width step finds a broken range only when it is wider than the step, so the step values and the pixels below them are always checked.
- The rings no longer draw with the scroll, and tablets in portrait show the timeline.

Follow-up:

- #54: the media query test, the four one-off values removed (or justified, with the owner's approval, here), the sweep and the fixes it calls for.
- #55: the career stage without pinning, and the timeline below 1024 px.
