// Playwright's browsers live in the git-ignored .tools folder (ADR 0006),
// installed there by `npm run e2e:install`. This module loads nothing of
// Playwright: Playwright reads PLAYWRIGHT_BROWSERS_PATH when it loads, so a
// script sets the variable from here before it imports Playwright.

import { fileURLToPath } from "node:url";

export const browsersPath = fileURLToPath(new URL("../.tools/ms-playwright", import.meta.url));
