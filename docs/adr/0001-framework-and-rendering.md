# ADR 0001: Framework and rendering

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

The site is the public presentation of the company: about ten page templates, in French and English, with long-form content (case studies, projects) and two interactive parts (a self-assessment quiz and an animated career timeline). The forces:

- **Speed is part of the message.** The target is a Lighthouse score of 100 in every category on mobile, with budgets of 30 KB of compressed HTML per page, 25 KB of CSS in total, and no JavaScript on pages that do not need it.
- **No server is needed.** No page depends on the visitor or on data that changes between builds.
- **Content in files.** Copy lives in Markdown, MDX (Markdown with components) and JSON files in the repository, so adding a project or a case study is adding one file.
- **One maintainer, helped by agents.** The stack must be well documented and stable.

## Options considered

1. **Astro, static output.** Builds plain HTML pages; ships no JavaScript unless a component opts in ("islands"). Content collections validate Markdown, MDX and JSON with schemas. Built-in routing for languages. Pros: matches every force above with the least code. Cons: a framework with its own release pace (a major version about once a year).
2. **Next.js, static export.** Already used in another of the owner's projects. Pros: familiar. Cons: ships the React runtime on every page unless worked around, which breaks the zero-JavaScript budget; static export disables several features.
3. **Eleventy (11ty).** Pros: minimal, zero JavaScript by default. Cons: no typed content schemas or component islands out of the box; more glue code for the quiz, the images and the languages.
4. **Hand-written HTML and a small build script.** Pros: no dependency. Cons: every feature (languages, images, sitemap, content validation) is custom code to maintain.

## Decision

Chosen: **option 1, Astro with `output: 'static'`**, in TypeScript with `strict` enabled.

- The current stable major version of Astro at setup, pinned in `package.json` and `package-lock.json`. Its documentation is read for the APIs used (content layer, internationalization, fonts, images), since they changed between majors.
- Node.js at the version in `.node-version`, the same locally and in continuous integration (CI). npm as the package manager.
- `trailingSlash: 'never'`, so every page has one URL.

## Consequences

Positive:

- Every page is a static file: nothing to run, patch or scale on a server.
- JavaScript is opt-in per component, which makes the budgets enforceable.

Negative:

- Astro majors need a migration pass, done as its own issue.

Follow-up:

- [ADR 0002](0002-hosting-and-environments.md) picks where the files are served.
- [ADR 0005](0005-client-side-javascript.md) decides which parts ship JavaScript and how.
