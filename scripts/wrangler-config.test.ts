import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";

// The Worker configuration as Wrangler itself reads it (ADR 0002). Workers
// Builds runs `wrangler deploy` on main and `wrangler preview` on every other
// branch; neither can run locally without the Cloudflare account.
const config = unstable_readConfig({
  config: fileURLToPath(new URL("../wrangler.jsonc", import.meta.url)),
});

describe("wrangler.jsonc", () => {
  it("names the Worker created in the Cloudflare dashboard", () => {
    expect(config.name).toBe("sekoya-website");
  });

  it("serves the Astro build without trailing slashes", () => {
    expect(config.assets?.directory).toMatch(/dist$/);
    expect(config.assets?.html_handling).toBe("drop-trailing-slash");
  });

  it("serves the nearest 404 page, with a 404 status, for an address that matches no file", () => {
    expect(config.assets?.not_found_handling).toBe("404-page");
  });

  // `wrangler preview` refuses to run without a previews block.
  it("has the previews block that preview builds need", () => {
    expect(config.previews).toBeDefined();
  });
});
