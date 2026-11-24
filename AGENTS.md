# Agent Instructions — sekoya-website

Standing rules for every AI agent working on this repository. The owner's general rules, valid in every project, are in `~/.claude/AGENTS.md`; this file adds the rules specific to this repository and takes precedence where the two conflict. Read this file, the [Architecture Decision Records (ADRs)](docs/adr/README.md) and the [roadmap](docs/roadmap.md) before working; ADRs are the source of truth for technical decisions.

## 1. Project context

- **The Sekoya Solutions website:** a static site built with Astro, in French at the root and English under `/en/`. Its source code is itself part of the portfolio, so the repository is public from the first commit (ADR 0009).
- **Stack:** decided one ADR at a time, listed in the [ADR index](docs/adr/README.md). Nothing is implemented before its ADR is accepted.
- **Responsive layout (ADR 0010):** media queries use only the widths 48, 64 and 80 rem and the height 45 rem; a unit test rejects any other value. A layout that breaks between two steps is fixed by making the component fluid, never by a rule for that range. A page or component is finished only when the width sweep passes on it.

## 2. Content rules (owner decisions)

- **No availability statements in the repository:** the README, `package.json`, code comments, commit messages, issues, pull requests and documentation never say that anyone is available for work or missions. The repository presents the site as a portfolio project and explains how it is built. Calls to contact the company belong on the website only.
- **Personal details only once approved:** a personal detail (name, region, career, dates, public profiles, photo) is committed only after the owner has approved that detail, and only in content files. Age, home address and any detail the site does not show are never committed (ADR 0009). Until a value is approved, it stays a `[TODO: …]` placeholder.
- **No price on the site:** no price, rate or currency amount on any page.
- **Measured figures only:** every score or figure the site shows comes from a measurement, shown with its date; a figure not yet measured or provided is a `[TODO: …]` placeholder, never an estimate (ADR 0007).

## 3. Working with the owner

- **Downloads:** standing exception to the general download rule: portable tools this project needs (Node.js, Playwright's browsers, lychee, npm packages installed into the project) are downloaded without asking, into the project's `.tools/` folder or `node_modules`. Anything installed system-wide still needs the owner's approval.

## 4. Commands and checks

- **Node.js:** the version in `.node-version`, portable in `.tools/node`, first on the `PATH` (`export PATH="$PWD/.tools/node:$PATH"` in Git Bash). npm is the package manager; `npm ci` installs the locked versions.
- **Before every push that changes code:** `npm run check` (Biome and `astro check`), `npm test` (Vitest), `npm run build` and `npm run build:feature-test` (the feature test build, with the contact form and the testimonials on, in `dist-feature/`), then `npm run test:e2e` (Playwright and axe, against both builds) and `npm run test:sweep` (the width sweep of ADR 0010, about two minutes). `npm run e2e:install` downloads Chromium into `.tools/ms-playwright` once per checkout.
- **Placeholders:** `npm run check:todos`, after a build, lists the `[TODO: …]` placeholders left and the missing files (the CV, `public/cv.pdf`). It fails when it finds any; `ALLOW_TODO=1` makes it report only, as CI does until the launch (#26) makes it a gate on the production build.
- **Lighthouse:** `npm run lighthouse` measures the site on mobile and writes `src/data/lighthouse.json`, the figures the footer and the portfolio show; run it in every pull request that changes pages, and commit the file with the change (ADR 0007). It needs Playwright's Chromium (`npm run e2e:install`). CI runs it as `npm run lighthouse -- --check`, which writes nothing and fails below 95.
- **Markdown checks:** `npm run lint:md` and `npm run links:md`, run on the Markdown files git tracks. `links:md` runs lychee offline and finds it on the `PATH`, or at the path in the `LYCHEE` variable (portable in `.tools/lychee`).
- **Worktrees:** a worktree has no `.tools` folder and no `node_modules`. Run `npm ci` in it, and create its `.tools` folder with junctions to the main checkout's `node` and `lychee` folders (`cmd /c mklink /J`), then run `npm run e2e:install`. Before deleting a worktree, remove its junctions first, as the general rules require.

## 5. Documentation

- **Docs layout:** `docs/adr/` (one ADR per significant choice, indexed in [docs/adr/README.md](docs/adr/README.md)) and [docs/roadmap.md](docs/roadmap.md) (a summary of the epics and their issues).

## 6. Git and GitHub

- Repository `sekoya-solutions/sekoya-website` (public). Only squash merges.
- **Labels:** one `type:` label (`bug`, `chore`, `feature`, `docs`, `spike`, `epic`) and at least one `area:` label (`architecture`, `ui`, `content`, `i18n`, `a11y`, `performance`, `seo`, `infra`) on every issue.
- **Board:** the [Sekoya Website board](https://github.com/users/sekoya-solutions/projects/4).

## 7. Maintaining this file

- Project-specific rules go here; rules for every project go in `~/.claude/AGENTS.md` (see its "Maintaining these rules" section).
