# ADR 0007: Measured figures and placeholders

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

The site proves its claims rather than stating them. Two rules follow:

- **Figures are measured, never typed.** The footer shows the site's own Lighthouse scores with their measurement date, read from `src/data/lighthouse.json`, which a script writes. Figures about other projects (test counts, their Lighthouse scores) come from those projects' published documentation and show their date.
- **No invented facts.** Any fact not yet provided (a date, a metric, a contact detail) appears as a visible `[TODO: …]` placeholder, and production must never ship one.

## Options considered

### Producing `lighthouse.json`

1. **A scheduled or manual workflow on `main`** measures the built site and opens a pull request when the figures change. Pros: no human step. Cons: a pull request opened with the workflow's own token does not trigger other workflows, so its CI never runs; it needs a GitHub App or a personal token, and a repository setting that lets Actions open pull requests.
2. **A local script, run in the pull request that changes pages:** `npm run lighthouse` builds the site, serves it locally, runs mobile Lighthouse three times on the main templates, keeps the median per category, and writes the file with the date; the result is committed in that pull request. CI's Lighthouse gate ([ADR 0006](0006-testing-and-ci.md)) still fails any change below 0.95. Pros: no token, ordinary review. Cons: the figures depend on the machine that measured them (Lighthouse's simulated throttling limits the spread).
3. **Measure production after each deployment** and commit the result. Pros: measures what visitors get. Cons: same token problem as option 1, and a commit after every deployment.

### Placeholder guard

1. **A build step, `scripts/check-todos.mjs`,** fails the production build when any `[TODO` string remains in the content or the built pages, or when a referenced file (such as the CV) is missing. Previews set `ALLOW_TODO=1` and render each placeholder as a visible chip. Pros: impossible to ship a placeholder by accident. Cons: production stays blocked until every placeholder is filled.

## Decision

Chosen: **option 2 for the figures, and the build guard.**

- If the file is missing, the footer says the measurement is pending; it never shows a number.
- The list of open placeholders is generated from the repository (a search for `[TODO`), not kept by hand.

## Consequences

Positive:

- No figure on the site can drift from its measurement without a reviewed change.

Negative:

- Refreshing the figures is a manual step in each pull request that changes pages.

Follow-up:

- Revisit option 1 or 3 if the manual step proves forgotten.
