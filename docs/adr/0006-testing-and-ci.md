# ADR 0006: Testing and continuous integration

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

The site's claims (speed, accessibility, honest figures) must be checked by machines on every change. The forces:

- **Gates.** Lint and types, unit tests, build, end-to-end and accessibility tests, Lighthouse scores, and the Markdown checks.
- **Public repository.** GitHub Actions minutes on standard runners are free for public repositories, but runs should stay short.
- **Documentation-only changes** run only the Markdown lint and link checks, in CI and locally, while still satisfying the required checks: a workflow filtered out by `paths` never reports and would block the merge, whereas a skipped job counts as passed.
- **Portable tools.** Tools run from the project's `node_modules` or its git-ignored `.tools/` folder; nothing is installed globally on a developer machine.

## Options considered

### Tools

1. **Biome** (lint and format for TypeScript, JavaScript, JSON and CSS), **Vitest** (unit tests: quiz scoring, ring geometry, typography helper, testimonials visibility), **Playwright with `@axe-core/playwright`** (keyboard paths, reduced motion, mobile and desktop, dark and light, French and English, zero axe violations), **Lighthouse CI** (mobile, every category at least 0.95, goal 1.0), **markdownlint-cli2** and **lychee** (Markdown lint and links). Pros: one fast tool per job; same set as another of the owner's projects. Cons: Playwright's browsers are a large download.
2. **ESLint and Prettier** instead of Biome. Pros: more plugins (Astro, accessibility). Cons: two tools, slower, more configuration.

### Pipeline

1. **One GitHub Actions workflow on pull requests and on `main`:** a first job classifies the change; when every changed file is Markdown, only the Markdown job runs and the heavy jobs are skipped (so they report as passed). Otherwise: check (Biome, `astro check`) → unit tests → build with size budgets → Playwright and axe → Lighthouse CI.
2. **Separate workflows filtered by `paths`.** Pros: simpler files. Cons: a filtered workflow never reports, so a required check blocks documentation-only pull requests.

## Decision

Proposed: **tools 1 and pipeline 1.**

- **Budgets as tests:** compressed HTML per page, total CSS, JavaScript per page (0 KB except the quiz and career pages), fonts.
- **Content rules as tests:** no price symbol on any page, no forbidden job title or headline wording, no French interface text under `/en/`.
- **The Markdown checks** run before every commit that touches Markdown, with the same versions as CI (`markdownlint-cli2` with the portable Node, and `lychee`, in `.tools/`).
- **Playwright's browsers** are downloaded into the project's git-ignored `.tools/` folder (`PLAYWRIGHT_BROWSERS_PATH`), never into the user profile; CI installs them on its runners. Portable tools need no approval to download in this project.

## Consequences

Positive:

- Every claim on the site has a check that fails when it stops being true.
- Documentation-only pull requests stay fast and still mergeable.

Negative:

- The full pipeline takes several minutes per push.

Follow-up:

- [ADR 0007](0007-measured-figures-and-placeholders.md) decides how the published Lighthouse figures are produced.
