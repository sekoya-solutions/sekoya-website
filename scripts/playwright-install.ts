// Downloads Playwright's Chromium into the git-ignored .tools/ms-playwright
// folder (ADR 0006), never into the user profile; playwright.config.ts points
// the tests to the same folder. Extra arguments go to `playwright install`,
// such as --with-deps in CI.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { browsersPath } from "../playwright.config.ts";

const cli = createRequire(import.meta.url).resolve("@playwright/test/cli");
const result = spawnSync(
  process.execPath,
  [cli, "install", "--only-shell", "chromium", ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath } },
);
if (result.error !== undefined) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
