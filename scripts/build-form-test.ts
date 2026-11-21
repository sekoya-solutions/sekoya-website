// Builds the site with the contact form on, into dist-form, for the
// end-to-end tests only (scripts/form-test.ts). Never deployed. The legal
// notice still names the form's service with a placeholder, so the build
// allows placeholders, as previews do (ADR 0007).

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { formTestAction, formTestOutDir } from "./form-test.ts";

const astro = join(
  dirname(createRequire(import.meta.url).resolve("astro/package.json")),
  "bin",
  "astro.mjs",
);
const result = spawnSync(process.execPath, [astro, "build", "--outDir", formTestOutDir], {
  stdio: "inherit",
  env: { ...process.env, PUBLIC_CONTACT_FORM_ACTION: formTestAction, ALLOW_TODO: "1" },
});
if (result.error !== undefined) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
