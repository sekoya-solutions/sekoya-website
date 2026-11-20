// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// ADR 0001: a static site, one URL per page without a trailing slash.
export default defineConfig({
  output: "static",
  trailingSlash: "never",
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
  vite: {
    plugins: [tailwindcss()],
  },
});
