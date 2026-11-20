# ADR 0003: Styling, theme and fonts

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

The brand defines exact colours for a dark theme (the primary presentation) and a light theme, one typeface (Outfit, variable weight, under the SIL Open Font License), a spacing scale, radii and motion easings. The forces:

- **Exact values.** Colours and type sizes are fixed by the brand and checked for contrast (Web Content Accessibility Guidelines, WCAG, 2.2 AA).
- **Budget.** 25 KB of compressed CSS in total; fonts at most 40 KB.
- **No flash.** A visitor who chose the light theme must not see the dark one first.
- **No third party.** Fonts are served by the site itself.

## Options considered

### Styling

1. **Tailwind CSS v4, through its Vite plugin, mapped to CSS custom properties.** The tokens are CSS variables in `src/styles/tokens.css`; Tailwind's `@theme` maps utilities to them. Component `<style>` blocks for animations. Pros: only used classes are shipped; utilities keep spacing and colours on the scale; same tool as another of the owner's projects. Cons: one more build dependency; long class lists in templates.
2. **Plain CSS with custom properties and Astro's scoped styles.** Pros: no dependency; the tokens are already CSS. Cons: more hand-written CSS to keep consistent and small.

### Theme

1. **Dark by default, a toggle stored in `localStorage`, set before paint by a small blocking inline script.** No automatic switch from `prefers-color-scheme`. Pros: the brand's primary look for every first visit; no flash. Cons: ignores a visitor's system preference until they use the toggle.
2. **Follow `prefers-color-scheme`, with the toggle as an override.** Pros: respects the system setting. Cons: most first visits on light systems see the secondary theme.

### Fonts

1. **Self-hosted Latin subset of Outfit as one variable WOFF2 file**, preloaded, `font-display: swap`, and a fallback face with `size-adjust` so the swap causes no layout shift. Pros: one 39 KB file for every weight. Cons: characters outside Latin, Latin-1 and Latin Extended-A fall back to the system font.
2. **Astro's font API** pointing at the same local file. Pros: generates the preload and fallback metrics. Cons: depends on the API being stable in the chosen Astro version; checked at setup.

## Decision

Proposed: **Tailwind CSS v4 with tokens as CSS variables (styling 1), dark by default with a stored toggle (theme 1), the self-hosted variable WOFF2 (fonts 1)**, generated through Astro's font API if it supports a local file with fallback metrics in the chosen version, by hand otherwise.

## Consequences

Positive:

- One source of truth for the brand values, testable by reading computed styles.
- No request leaves the site for styles or fonts.

Negative:

- The theme script is the one blocking script in `<head>`; it stays a few lines.

Follow-up:

- Tests check computed colours in both themes and the contrast pairs.
