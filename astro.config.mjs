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
  vite: {
    plugins: [tailwindcss()],
  },
});
