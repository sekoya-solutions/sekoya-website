// The test build of the contact form (ADR 0008). The form is off on the
// site, so the end-to-end tests check it on a second build, with a test
// address set, served on its own port (playwright.config.ts). The address is
// on the reserved `.test` domain, which never resolves: the tests catch the
// form's request before it leaves the browser.

/** The address the test build's form posts to. */
export const formTestAction = "https://form.test/messages";

/** The test build's folder, served by e2e/wrangler.form-test.jsonc. */
export const formTestOutDir = "dist-form";

/** The port the test build is served on. */
export const formTestPort = 4322;
