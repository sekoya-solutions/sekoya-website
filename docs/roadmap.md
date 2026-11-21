# Roadmap

A summary of the epics and their issues, and what each delivers. Status is kept on the [board](https://github.com/users/sekoya-solutions/projects/4) and on the issues, not here.

## Outside the epics

- [#1](https://github.com/sekoya-solutions/sekoya-website/issues/1) Record the initial architecture decisions: the first nine [Architecture Decision Records (ADRs)](adr/README.md), from the framework to the repository and its licences, written before any code.

## [Epic #8](https://github.com/sekoya-solutions/sekoya-website/issues/8): Foundation

Everything the pages build on.

- [#3](https://github.com/sekoya-solutions/sekoya-website/issues/3) Set up the repository and tooling: the Astro project (static output, TypeScript strict, Tailwind CSS 4) with an empty home page; Biome, Vitest, Playwright with axe, and the Markdown checks; a CI workflow that runs only the Markdown checks when every changed file is Markdown; the project rules in `AGENTS.md`, the README, the licences and this roadmap.
- [#4](https://github.com/sekoya-solutions/sekoya-website/issues/4) Host the site on Cloudflare Workers with previews: the repository connected to a Worker with static assets, built by Workers Builds, with production from `main` on `workers.dev` until launch and a preview per branch, both kept out of search engines; security headers, cache lifetimes and a per-page Content Security Policy; the end-to-end tests served by `wrangler dev`; and the [hosting setup](hosting.md) for the owner.
- [#5](https://github.com/sekoya-solutions/sekoya-website/issues/5) Add the brand assets: the logos for dark and light backgrounds, the themeable animated logo, the favicons and app icons, and the Outfit font with its licence, as provided, with `LICENSE-ASSETS.md` listing where they are.
- [#6](https://github.com/sekoya-solutions/sekoya-website/issues/6) Design tokens, fonts, base layout and theme: the brand tokens as CSS variables mapped into Tailwind, the self-hosted font, the base layout with header and footer shells, and the theme toggle.
- [#7](https://github.com/sekoya-solutions/sekoya-website/issues/7) Language scaffolding: French at the root and English under `/en/`, with the map of translated paths, the interface dictionaries, the FR | EN language switch, `hreflang` alternates with `x-default` on every page, the French typography helper, and a test that visits every route in both languages.
- [#29](https://github.com/sekoya-solutions/sekoya-website/issues/29) Keep the design references outside the repository: ADR 0009 records that the page mockups are never committed.

## [Epic #11](https://github.com/sekoya-solutions/sekoya-website/issues/11): Home page

- [#9](https://github.com/sekoya-solutions/sekoya-website/issues/9) Hero and logo growth animation: the inlined animated logo with its circuit extension, halo, travelling dot and dot grid, in pure CSS with nothing running under reduced motion; the copy in the first content collection, with `[TODO: …]` placeholder chips for the facts still to approve; and the calls to action, each shown once its page exists.
- [#10](https://github.com/sekoya-solutions/sekoya-website/issues/10) Home sections: value propositions, offers teaser, featured case study with its integration map, portfolio teaser with the projects' screenshots and a dated measured figure, quiz teaser with a sample gauge labelled as an example, and contact band, all from the `home` collection; circuit dividers between them; each link to another page of the site shown once that page exists; and the scroll reveal, in CSS scroll-driven animations with a small inline fallback script, with everything visible without JavaScript and nothing hidden or moving under reduced motion.

## [Epic #17](https://github.com/sekoya-solutions/sekoya-website/issues/17): Content pages

- [#12](https://github.com/sekoya-solutions/sekoya-website/issues/12) Offers page: at `/offres` and `/en/services`, the three offers from the `offers` collection in cards aligned row by row with CSS subgrid, each at the anchor the home teaser links to, then the three steps to start and the quiz band, each call to action shown once its page exists; and a test that finds no currency symbol or code on any built page.
- [#13](https://github.com/sekoya-solutions/sekoya-website/issues/13) Case studies: at `/realisations` and `/en/case-studies`, a card per case study aligned row by row with CSS subgrid, then the CV button once `public/cv.pdf` exists and a placeholder until then; a page per case study, made from its MDX file in the `caseStudies` collection with no code change, with the role and period, the context, what was done, the results (a result still to measure is a placeholder chip), the stack and a closing band; French typography and placeholder chips in MDX bodies; and the placeholder guard, `npm run check:todos`, which reports the placeholders left and the missing files in CI.
- [#14](https://github.com/sekoya-solutions/sekoya-website/issues/14) Portfolio: at `/portfolio` and `/en/portfolio`, a card per project from its MDX file in the `projects` collection, with no code change, in a grid of one to three columns where a card may span two, and a ghost card that fills the rest of the last row; filters by category in CSS only (radio buttons and `:has()`); a page per project with its figures, each dated and linked to its source, what it demonstrates, its screenshots and its stack; and, for Sekoya Transit, the playable demo behind a click-to-load facade, a small inline script that ADR 0005 now allows, with a notice and a link instead below 1280 px or on a touch screen; and each card of the home page's portfolio section now links to its project page.
- [#15](https://github.com/sekoya-solutions/sekoya-website/issues/15) About page and working with AI: at `/a-propos` and `/en/about`, from the `about` collection, who (with the brand avatar and a placeholder until a photo is added to the content), the values, what clients get, the technologies of today and of past experience, and, at the `#ia` anchor, how the work is done with AI: the tools, the four-step workflow and the guardrails, with links to the AGENTS.md files of Sekoya Transit and Sekoya Parts; then a closing band, each call to action shown once its page exists.
- [#16](https://github.com/sekoya-solutions/sekoya-website/issues/16) Contact page and legal notice: contact links, the optional form switched off by default, the subject prefill from the quiz, and the French legal notice.
- [#37](https://github.com/sekoya-solutions/sekoya-website/issues/37) Header navigation: the links to the main pages and the contact button, each shown once its page exists, and a mobile menu that works without JavaScript.

## [Epic #20](https://github.com/sekoya-solutions/sekoya-website/issues/20): Interactive features

- [#18](https://github.com/sekoya-solutions/sekoya-website/issues/18) Career tree rings: the career as a tree-trunk cross-section, with build-time ring geometry, scroll-driven drawing, tooltip, pinned panel, legend, and a vertical timeline fallback.
- [#19](https://github.com/sekoya-solutions/sekoya-website/issues/19) Self-assessment quiz: the ten-question quiz as a Preact island, its result screen and the no-JavaScript fallback.

## [Epic #27](https://github.com/sekoya-solutions/sekoya-website/issues/27): Quality, SEO and launch

- [#21](https://github.com/sekoya-solutions/sekoya-website/issues/21) Lighthouse pipeline and footer scores: the local Lighthouse script that writes the measured figures, the footer badges that read them, and the Lighthouse CI gate.
- [#22](https://github.com/sekoya-solutions/sekoya-website/issues/22) Search engine metadata: titles, descriptions, canonical URLs, social sharing metadata with the default social sharing image, structured data, sitemap, robots file and the 404 page.
- [#23](https://github.com/sekoya-solutions/sekoya-website/issues/23) Testimonials component, hidden until data exists: the `testimonials` collection, empty at launch, and its component.
- [#24](https://github.com/sekoya-solutions/sekoya-website/issues/24) English pass: all content translated faithfully into English, reviewed by the owner.
- [#25](https://github.com/sekoya-solutions/sekoya-website/issues/25) Fill the owner-provided facts: every placeholder replaced with facts the owner provides and approves.
- [#26](https://github.com/sekoya-solutions/sekoya-website/issues/26) Move the DNS zone and launch on the domain: the domain's DNS zone moved to Cloudflare with the email records intact, the domain connected to the Worker, the placeholder guard made a gate on the production build, and the final checks.
