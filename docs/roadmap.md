# Roadmap

A summary of the epics and their issues, and what each delivers. Status is kept on the [board](https://github.com/users/sekoya-solutions/projects/4) and on the issues, not here.

## Outside the epics

- [#1](https://github.com/sekoya-solutions/sekoya-website/issues/1) Record the initial architecture decisions: the first nine [Architecture Decision Records (ADRs)](adr/README.md), from the framework to the repository and its licences, written before any code.

## [Epic #8](https://github.com/sekoya-solutions/sekoya-website/issues/8): Foundation

Everything the pages build on.

- [#3](https://github.com/sekoya-solutions/sekoya-website/issues/3) Set up the repository and tooling: the Astro project (static output, TypeScript strict, Tailwind CSS 4) with an empty home page; Biome, Vitest, Playwright with axe, and the Markdown checks; a CI workflow that runs only the Markdown checks when every changed file is Markdown; the project rules in `AGENTS.md`, the README, the licences and this roadmap.
- [#4](https://github.com/sekoya-solutions/sekoya-website/issues/4) Host the site on Cloudflare Workers with previews: the repository connected to a Worker with static assets, built by Workers Builds, with a preview per branch.
- [#5](https://github.com/sekoya-solutions/sekoya-website/issues/5) Add the brand assets: logos, animated logo, favicons, font and the default social sharing image.
- [#6](https://github.com/sekoya-solutions/sekoya-website/issues/6) Design tokens, fonts, base layout and theme: the brand tokens as CSS variables mapped into Tailwind, the self-hosted font, the base layout with header and footer shells, and the theme toggle.
- [#7](https://github.com/sekoya-solutions/sekoya-website/issues/7) Language scaffolding: French at the root and English under `/en/`, with translated paths, dictionaries and the language switch.
- [#29](https://github.com/sekoya-solutions/sekoya-website/issues/29) Keep the design references outside the repository: ADR 0009 records that the page mockups are never committed.

## [Epic #11](https://github.com/sekoya-solutions/sekoya-website/issues/11): Home page

- [#9](https://github.com/sekoya-solutions/sekoya-website/issues/9) Hero and logo growth animation: the inlined animated logo with its circuit extension, halo and dot grid, the copy and the calls to action.
- [#10](https://github.com/sekoya-solutions/sekoya-website/issues/10) Home sections: value propositions, offers teaser, featured case study with its integration map, portfolio teaser, quiz teaser, contact band, circuit dividers and scroll reveal.

## [Epic #17](https://github.com/sekoya-solutions/sekoya-website/issues/17): Content pages

- [#12](https://github.com/sekoya-solutions/sekoya-website/issues/12) Offers page: the three offers from the `offers` collection, the three steps and the quiz band.
- [#13](https://github.com/sekoya-solutions/sekoya-website/issues/13) Case studies: the `caseStudies` collection in MDX, the index and detail template, the metrics component and the CV link.
- [#14](https://github.com/sekoya-solutions/sekoya-website/issues/14) Portfolio: the `projects` collection, the grid with spans and the ghost card, CSS-only filters, detail pages, and the click-to-load facade for the playable demo.
- [#15](https://github.com/sekoya-solutions/sekoya-website/issues/15) About page and working with AI: who, values, what clients get, stack groups, and how the work is done with AI, with its workflow and guardrails.
- [#16](https://github.com/sekoya-solutions/sekoya-website/issues/16) Contact page and legal notice: contact links, the optional form switched off by default, the subject prefill from the quiz, and the French legal notice.

## [Epic #20](https://github.com/sekoya-solutions/sekoya-website/issues/20): Interactive features

- [#18](https://github.com/sekoya-solutions/sekoya-website/issues/18) Career tree rings: the career as a tree-trunk cross-section, with build-time ring geometry, scroll-driven drawing, tooltip, pinned panel, legend, and a vertical timeline fallback.
- [#19](https://github.com/sekoya-solutions/sekoya-website/issues/19) Self-assessment quiz: the ten-question quiz as a Preact island, its result screen and the no-JavaScript fallback.

## [Epic #27](https://github.com/sekoya-solutions/sekoya-website/issues/27): Quality, SEO and launch

- [#21](https://github.com/sekoya-solutions/sekoya-website/issues/21) Lighthouse pipeline and footer scores: the local Lighthouse script that writes the measured figures, the footer badges that read them, and the Lighthouse CI gate.
- [#22](https://github.com/sekoya-solutions/sekoya-website/issues/22) Search engine metadata: titles, descriptions, canonical URLs, social sharing metadata, structured data, sitemap, robots file and the 404 page.
- [#23](https://github.com/sekoya-solutions/sekoya-website/issues/23) Testimonials component, hidden until data exists: the `testimonials` collection, empty at launch, and its component.
- [#24](https://github.com/sekoya-solutions/sekoya-website/issues/24) English pass: all content translated faithfully into English, reviewed by the owner.
- [#25](https://github.com/sekoya-solutions/sekoya-website/issues/25) Fill the owner-provided facts: every placeholder replaced with facts the owner provides and approves.
- [#26](https://github.com/sekoya-solutions/sekoya-website/issues/26) Move the DNS zone and launch on the domain: the domain's DNS zone moved to Cloudflare with the email records intact, the domain connected to the Worker, and the final checks.
