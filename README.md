# Sekoya Solutions website

The source of the Sekoya Solutions website: a static site, in French with an English translation, built as a portfolio project. Speed and accessibility are checked by machines on every change, and every figure the site shows is measured. Each technical choice is recorded in an [Architecture Decision Record (ADR)](docs/adr/README.md), and the [roadmap](docs/roadmap.md) lists what is built, step by step.

## Stack

- [Astro](https://astro.build/) with static output, in TypeScript with `strict` enabled ([ADR 0001](docs/adr/0001-framework-and-rendering.md)).
- [Tailwind CSS](https://tailwindcss.com/) 4, through its Vite plugin ([ADR 0003](docs/adr/0003-styling-theme-and-fonts.md)).
- [Biome](https://biomejs.dev/) for linting and formatting, [Vitest](https://vitest.dev/) for unit tests, [Playwright](https://playwright.dev/) with [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for end-to-end and accessibility tests, [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) and [lychee](https://lychee.cli.rs/) for the Markdown files, [Lighthouse](https://developer.chrome.com/docs/lighthouse) for the measured scores ([ADR 0006](docs/adr/0006-testing-and-ci.md)).
- GitHub Actions for continuous integration (CI).
- [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) with static assets for hosting, built by Workers Builds with a preview per branch ([ADR 0002](docs/adr/0002-hosting-and-environments.md), [hosting setup](docs/hosting.md)).

## Commands

Node.js at the version in [`.node-version`](.node-version), with npm.

| Command | What it does |
| --- | --- |
| `npm ci` | Installs the locked dependencies |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the static site into `dist/` |
| `npm run build:form-test` | Builds the site with the contact form on, into `dist-form/`, for the end-to-end tests only (the form is off on the site) |
| `npm run preview` | Serves the build in `dist/` with `wrangler dev`, with the hosting configuration and headers |
| `npm run check` | Lints and checks formatting (Biome), and checks types (`astro check`) |
| `npm run format` | Fixes formatting and safe lint issues |
| `npm test` | Runs the unit tests |
| `npm run e2e:install` | Downloads Chromium for Playwright into `.tools/ms-playwright` |
| `npm run test:e2e` | Runs the end-to-end and accessibility tests against the builds (run `npm run build` and `npm run build:form-test` first) |
| `npm run check:todos` | Lists the `[TODO: …]` placeholders left in the content and the build, and the missing files such as the CV; fails when it finds any, unless `ALLOW_TODO=1` (run `npm run build` first) |
| `npm run lighthouse` | Builds the site, serves it with `wrangler dev`, runs mobile Lighthouse three times on one page per template and writes the medians, with the date, into `src/data/lighthouse.json`, which the footer and the portfolio show; with `-- --check`, writes nothing and fails when a page is below 95 in any category (run `npm run e2e:install` first) |
| `npm run lint:md` | Lints the tracked Markdown files |
| `npm run links:md` | Checks the links between the tracked Markdown files, offline (needs `lychee`) |

## Structure

| Path | Contents |
| --- | --- |
| `src/pages/` | One file per page: French at the root, English under `en/` |
| `src/layouts/` | The base layout of every page |
| `src/components/` | Components: the logo, the header with its navigation and menu, the footer with its measured scores, the language switch, the theme toggle and its script, the scroll reveal script, the placeholder chip, the shared buttons, chips and icons, the home hero and its animated scene, the home sections, the offer, case study and project cards, the About page's AI workflow, the contact form and the contact subject's script, the portfolio's filters and the playable demo's facade and script, and the page bodies shared by both languages |
| `src/i18n/` | The languages, the interface strings of each (`fr.ts`, `en.ts`), the map of translated paths (`routes.ts`) and the reading of the content in a page's language (`content.ts`) |
| `src/content/` | Long copy, in content collections declared in `src/content.config.ts`: one entry per language (`fr.json`, `en.json`), or one MDX file per case study or portfolio project and language (`case-studies/<language>/<slug>.mdx`, `projects/<language>/<slug>.mdx`), which also makes its page; the company's facts, the same in every language, in `company/company.json` |
| `src/lib/` | Pure functions, with their unit tests, the reading of the Lighthouse measurement, and the Markdown plugin that gives MDX bodies French typography and placeholder chips |
| `src/styles/` | The brand tokens (`tokens.css`), mapped into Tailwind with the base styles, the card and the scroll reveal (`global.css`) |
| `src/assets/` | Logos, animated logo, avatar, portfolio screenshots and font, processed by the build |
| `src/data/` | The Lighthouse measurement, written by `npm run lighthouse` |
| `public/` | Files copied as they are into the build, including the `_headers` and `_redirects` files |
| `e2e/` | End-to-end and accessibility tests, and the Worker configuration that serves the test build with the contact form on |
| `scripts/` | Build and CI helper scripts, with their unit tests |
| `docs/adr/` | Architecture Decision Records |
| `docs/roadmap.md` | The epics and their issues |
| `docs/hosting.md` | The hosting configuration and its one-time setup |
| `wrangler.jsonc` | The Cloudflare Worker that serves the site |
| `.github/workflows/` | The CI workflow |

## Continuous integration

On every pull request and every push to `main`, a first job classifies the change. When every changed file is Markdown, only the Markdown checks run and the other jobs report as skipped. Otherwise lint and types, unit tests, the build and the test build with the contact form on, a report of the placeholders left, the end-to-end and accessibility tests, and the Lighthouse gate, which fails when a page scores below 95 in any category on mobile, run as well.

## Licence

All rights reserved: the repository is public to be read, not reused. The Outfit font keeps its own SIL Open Font License. See [LICENSE](LICENSE).
