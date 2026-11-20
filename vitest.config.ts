import { defineConfig } from "vitest/config";

// Unit tests sit next to the code they test. The end-to-end tests in e2e/
// run with Playwright instead.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
