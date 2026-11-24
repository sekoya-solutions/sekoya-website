# ADR 0004: Content and languages

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

The site is written in French and translated faithfully into English. Long copy (case studies, projects) and structured data (offers, career positions, quiz, testimonials) must be editable without touching components. The forces:

- **French first.** French pages are the default and have no language prefix; English pages live under `/en/`, with translated paths (`/offres` and `/en/services`).
- **Equivalent pages.** The language switch lands on the same page in the other language; every page declares its alternates (`hreflang`, with `x-default` pointing to French).
- **Validated content.** A missing field or a wrong type fails the build, not the page.
- **French typography.** Non-breaking spaces before `: ; ? ! »` and after `«`.

## Options considered

### Content

1. **Astro content collections with Zod schemas**: `caseStudies` and `projects` in MDX, `offers`, `career`, `quiz` and `testimonials` in JSON, one entry per language. Pros: typed, validated at build time, adding an entry needs no code. Cons: schema changes need care with existing entries.
2. **A headless content management system (CMS).** Pros: editing in a web interface. Cons: an external service, an account and a build-time dependency for a single editor who works in the repository.

### Languages

1. **Astro's built-in internationalization (i18n)** with `fr` as the default locale without prefix, `en` prefixed, interface strings in `src/i18n/{fr,en}.ts`, and a map of translated paths in `src/i18n/routes.ts`. Pros: built-in, static. Cons: translated paths are not built in, so the map is maintained by hand and covered by a test.
2. **A third-party i18n library.** Pros: richer features (plurals, formatting). Cons: a dependency for a few dozen strings; `Intl` covers dates and numbers.

## Decision

Chosen: **content collections with schemas (content 1) and Astro's built-in i18n with a route map (languages 1)**.

- No French text in components: interface strings in the dictionaries, long copy in collections.
- French typography applied by a small helper in the content pipeline, covered by unit tests.
- Dates shown numerically (`05/2022 – 09/2025`) in both languages.
- The sitemap is built from the route map, not with `@astrojs/sitemap`, which pairs languages by identical paths and so cannot link translated paths such as `/offres` and `/en/services`.
- Testimonials are the exception to one entry per language: one file per testimonial holds the quote as its author wrote it, marked with its language, and any translation the author approved. A page in another language shows the translation, marked as translated, or else the original.

## Consequences

Positive:

- Content errors fail the build.
- A test iterates every route in both languages, so a missing translation or a broken switch fails CI.

Negative:

- Each page exists twice; the English pass is its own step, reviewed by the owner before release.

Follow-up:

- [ADR 0007](0007-measured-figures-and-placeholders.md) adds the placeholder guard on content.
