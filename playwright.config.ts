import { defineConfig, devices } from "@playwright/test";
import { featureTestPort } from "./scripts/feature-test.ts";
import { browsersPath } from "./scripts/playwright-browsers.ts";

// Playwright's browsers, in .tools/ms-playwright (scripts/playwright-browsers.ts).
// The test workers, which launch the browsers, inherit this variable from
// the runner.
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

const port = 4321;
const isCI = process.env.CI !== undefined && process.env.CI !== "";

// The tests run against the production build in dist/, served by
// `wrangler dev`, Cloudflare's local emulation of the Worker, with its
// configuration and headers files (ADR 0002): run `npm run build` first.
// The tests of the features that are off on the site (the contact form, the
// testimonials) run against the feature test build, in dist-feature/ on its
// own port (scripts/feature-test.ts): run `npm run build:feature-test` first too.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // The width sweep (e2e/sweep.spec.ts, ADR 0010) is a project of its own,
  // run by `npm run test:sweep` and its own CI job, not by `npm run test:e2e`.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /sweep\.spec\.ts$/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /sweep\.spec\.ts$/ },
    { name: "sweep", use: { ...devices["Desktop Chrome"] }, testMatch: /sweep\.spec\.ts$/ },
  ],
  webServer: [
    { command: `npm run preview -- --port ${port}`, url: `http://localhost:${port}` },
    {
      command: `npm run preview -- --config e2e/wrangler.feature-test.jsonc --port ${featureTestPort}`,
      url: `http://localhost:${featureTestPort}`,
    },
  ].map((server) => ({
    ...server,
    // No usage data is sent from the local Worker servers.
    env: { WRANGLER_SEND_METRICS: "false" },
    reuseExistingServer: !isCI,
    timeout: 60_000,
  })),
});
