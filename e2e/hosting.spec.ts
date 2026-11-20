import { expect, test } from "@playwright/test";

// The build in dist/ served by `wrangler dev`, Cloudflare's local emulation,
// which applies wrangler.jsonc, public/_headers and public/_redirects (ADR 0002).

const securityHeaders = {
  "content-security-policy": "frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000",
};

test("pages are sent with the security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()).toMatchObject(securityHeaders);
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
});

test("pages carry a Content Security Policy that their own code satisfies", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });
  await page.goto("/");
  const policy = await page
    .locator('meta[http-equiv="content-security-policy"]')
    .getAttribute("content");
  expect(policy).toContain("default-src 'self'");
  expect(policy).not.toContain("'unsafe-inline'");
  expect(violations).toEqual([]);
});

test("fingerprinted files are cached for a year, pages are revalidated", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const stylesheet = await page.locator('link[rel="stylesheet"]').first().getAttribute("href");
  expect(stylesheet).toMatch(/^\/_astro\//);
  const asset = await request.get(stylesheet ?? "");
  expect(asset.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  const html = await request.get("/");
  expect(html.headers()["cache-control"]).not.toContain("immutable");
});

test("workers.dev hosts are not indexed, the custom domain is", async ({ request }) => {
  const robots = async (host: string) =>
    (await request.get("/", { headers: { host } })).headers()["x-robots-tag"];
  expect(await robots("sekoya-website.example.workers.dev")).toBe("noindex");
  expect(await robots("my-branch-sekoya-website.example.workers.dev")).toBe("noindex");
  expect(await robots("sekoyasolutions.com")).toBeUndefined();
});

test("URLs without a trailing slash are canonical", async ({ request }) => {
  const response = await request.get("/index.html", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/");
});

test("the headers and redirects files are not served", async ({ request }) => {
  expect((await request.get("/_headers")).status()).toBe(404);
  expect((await request.get("/_redirects")).status()).toBe(404);
});
