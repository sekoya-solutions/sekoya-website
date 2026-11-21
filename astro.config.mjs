// @ts-check
import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import { defaultLocale, locales } from "./src/i18n/config.ts";
import { contentTypography } from "./src/lib/content-typography.ts";

// ADR 0001: a static site, one URL per page without a trailing slash.
export default defineConfig({
  output: "static",
  trailingSlash: "never",
  // The production domain (ADR 0002), for the full URLs search engines
  // require, such as the hreflang alternates. Previews and workers.dev also
  // point there; they are kept out of search engines.
  site: "https://sekoyasolutions.com",
  // ADR 0004: French at the root, English under /en/. The translated paths
  // are mapped in src/i18n/routes.ts.
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  // Pages are written as `offres.html` rather than `offres/index.html`, the
  // build format that matches URLs without a trailing slash.
  build: {
    format: "file",
  },
  // ADR 0002: each page carries a Content Security Policy in a meta tag, with
  // the hashes of its own inline scripts and styles, so no 'unsafe-inline' is
  // needed. The directives a meta tag cannot carry (frame-ancestors) are sent
  // as a header from public/_headers. No form-action: the optional contact
  // form posts to another origin (ADR 0008).
  security: {
    csp: {
      directives: ["default-src 'self'", "object-src 'none'", "base-uri 'self'"],
    },
  },
  // ADR 0003: Outfit, one self-hosted variable WOFF2 for every weight, served
  // by Astro's font API with a hashed URL and `font-display: swap`. The
  // fallbacks end with a generic family, so Astro also generates fallback
  // faces with `size-adjust` and metric overrides: the swap shifts no layout.
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Outfit",
      cssVariable: "--font-outfit",
      fallbacks: ["system-ui"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/Outfit-latin-variable.woff2"],
            weight: "100 900",
            style: "normal",
          },
        ],
      },
    },
  ],
  // ADR 0005: the quiz is a Preact island, its only framework component.
  // ADR 0004: case studies are MDX. Their bodies get French typography and
  // placeholder chips like the rest of the content
  // (src/lib/content-typography.ts), and keep their punctuation as written,
  // as the JSON collections do: no smart quotes or dashes.
  integrations: [mdx(), preact()],
  markdown: {
    processor: satteri({
      hastPlugins: [contentTypography],
      features: { smartPunctuation: false },
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
