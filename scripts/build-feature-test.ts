// Builds the feature test build (scripts/feature-test.ts) into its folder,
// for the end-to-end tests only: the contact form on, and the testimonials
// read from their fixture folder. Never deployed. The legal notice still
// names the form's service with a placeholder, so the build allows
// placeholders, as previews do (ADR 0007).

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { testimonialsFolderVariable } from "../src/content/testimonials.ts";
import { featureTestOutDir, formTestAction, testimonialsFixtureFolder } from "./feature-test.ts";

const astro = join(
  dirname(createRequire(import.meta.url).resolve("astro/package.json")),
  "bin",
  "astro.mjs",
);
const result = spawnSync(process.execPath, [astro, "build", "--outDir", featureTestOutDir], {
  stdio: "inherit",
  env: {
    ...process.env,
    PUBLIC_CONTACT_FORM_ACTION: formTestAction,
    [testimonialsFolderVariable]: testimonialsFixtureFolder,
    ALLOW_TODO: "1",
  },
});
if (result.error !== undefined) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
