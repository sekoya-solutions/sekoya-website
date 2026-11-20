# Sekoya Solutions website

The source of the Sekoya Solutions website: a static site, in French with an English translation, built as a portfolio project. Speed and accessibility are checked by machines on every change, and every figure the site shows is measured. Each technical choice is recorded in an [Architecture Decision Record (ADR)](docs/adr/README.md), and the [roadmap](docs/roadmap.md) lists what is built, step by step.

## Stack

- [Astro](https://astro.build/) with static output, in TypeScript with `strict` enabled ([ADR 0001](docs/adr/0001-framework-and-rendering.md)).
- [Tailwind CSS](https://tailwindcss.com/) 4, through its Vite plugin ([ADR 0003](docs/adr/0003-styling-theme-and-fonts.md)).
- [Biome](https://biomejs.dev/) for linting and formatting, [Vitest](https://vitest.dev/) for unit tests, [Playwright](https://playwright.dev/) with [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for end-to-end and accessibility tests, [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) and [lychee](https://lychee.cli.rs/) for the Markdown files ([ADR 0006](docs/adr/0006-testing-and-ci.md)).
- GitHub Actions for continuous integration (CI).

## Commands

Node.js at the version in [`.node-version`](.node-version), with npm.

| Command | What it does |
| --- | --- |
| `npm ci` | Installs the locked dependencies |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the static site into `dist/` |
| `npm run preview` | Serves the build in `dist/` |
| `npm run check` | Lints and checks formatting (Biome), and checks types (`astro check`) |
| `npm run format` | Fixes formatting and safe lint issues |
| `npm test` | Runs the unit tests |
| `npm run e2e:install` | Downloads Chromium for Playwright into `.tools/ms-playwright` |
| `npm run test:e2e` | Runs the end-to-end and accessibility tests against the build (run `npm run build` first) |
| `npm run lint:md` | Lints the tracked Markdown files |
| `npm run links:md` | Checks the links between the tracked Markdown files, offline (needs `lychee`) |

## Structure

| Path | Contents |
| --- | --- |
| `src/pages/` | One file per page |
| `src/styles/` | Global styles |
| `e2e/` | End-to-end and accessibility tests |
| `scripts/` | Build and CI helper scripts, with their unit tests |
| `docs/adr/` | Architecture Decision Records |
| `docs/roadmap.md` | The epics and their issues |
| `.github/workflows/` | The CI workflow |

## Continuous integration

On every pull request and every push to `main`, a first job classifies the change. When every changed file is Markdown, only the Markdown checks run and the other jobs report as skipped. Otherwise lint and types, unit tests, the build and the end-to-end and accessibility tests run as well.

## Licence

The source code is under the [MIT licence](LICENSE). The brand assets are not: see [LICENSE-ASSETS.md](LICENSE-ASSETS.md).
