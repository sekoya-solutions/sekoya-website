// The feature test build: the site with the features that are off on it
// turned on, so the end-to-end tests can check them. It is built into its
// own folder and served on its own port (playwright.config.ts), never
// deployed.
//
// - The contact form (ADR 0008), with a test address on the reserved `.test`
//   domain, which never resolves: the tests catch the form's request before
//   it leaves the browser.
// - The testimonials (#23), from a fixture folder in place of the site's
//   empty one (src/content/testimonials.ts).

/** The address the test build's form posts to. */
export const formTestAction = "https://form.test/messages";

/** The test build's testimonials, from the project's root. */
export const testimonialsFixtureFolder = "e2e/fixtures/testimonials";

/** The test build's folder, served by e2e/wrangler.feature-test.jsonc. */
export const featureTestOutDir = "dist-feature";

/** The port the test build is served on. */
export const featureTestPort = 4322;
