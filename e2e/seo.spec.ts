import { expect, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { isListed, pathOf, type RouteKey, routes } from "../src/i18n/routes";

// The metadata for search engines and social networks, on the build served
// by `wrangler dev`: every page's title, description, canonical URL, sharing
// tags and structured data; the sitemap and robots file; and the 404 pages.

const site = "https://sekoyasolutions.com";
const pages = (Object.keys(routes) as RouteKey[]).flatMap((key) =>
  locales.map((locale) => ({ key, locale, path: pathOf(key, locale) })),
);

// Unique within a language: a page and its translation may share a title,
// such as Portfolio, and search engines pair them by their hreflang links.
test("every page has a title and a description of its own in its language, within their lengths", async ({
  page,
}) => {
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const { locale, path } of pages) {
    await page.goto(path);
    const title = await page.title();
    const description =
      (await page.locator('head meta[name="description"]').getAttribute("content")) ?? "";
    expect(title.length, `${path}: ${title}`).toBeGreaterThan(0);
    expect(title.length, `${path}: ${title}`).toBeLessThanOrEqual(60);
    expect(description.length, `${path}: ${description}`).toBeGreaterThan(0);
    expect(description.length, `${path}: ${description}`).toBeLessThanOrEqual(155);
    const titleKey = `${locale} ${title}`;
    const descriptionKey = `${locale} ${description}`;
    expect(
      titles.get(titleKey),
      `${path} has the title of ${titles.get(titleKey)}`,
    ).toBeUndefined();
    expect(
      descriptions.get(descriptionKey),
      `${path} has the description of ${descriptions.get(descriptionKey)}`,
    ).toBeUndefined();
    titles.set(titleKey, path);
    descriptions.set(descriptionKey, path);
  }
});

for (const { key, locale, path } of pages) {
  test(`${key} in ${locale} (${path}) carries its sharing tags and structured data`, async ({
    page,
  }) => {
    await page.goto(path);
    const head = page.locator("head");
    const meta = (attribute: string, name: string) =>
      head.locator(`meta[${attribute}="${name}"]`).getAttribute("content");

    if (isListed(key)) {
      await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site}${path}`);
      await expect(head.locator('meta[name="robots"]')).toHaveCount(0);
    } else {
      await expect(head.locator('link[rel="canonical"]')).toHaveCount(0);
      expect(await meta("name", "robots")).toBe("noindex");
    }

    expect(await meta("property", "og:title")).toBe(await page.title());
    expect(await meta("property", "og:description")).toBe(await meta("name", "description"));
    expect(await meta("property", "og:url")).toBe(`${site}${path}`);
    expect(await meta("property", "og:locale")).toBe(locale === "fr" ? "fr_FR" : "en_US");
    expect(await meta("property", "og:image")).toBe(`${site}/og/og-default.png`);
    expect(await meta("property", "og:image:alt")).toBeTruthy();
    expect(await meta("name", "twitter:card")).toBe("summary_large_image");

    const scripts = await head
      .locator('script[type="application/ld+json"]')
      .evaluateAll((elements) => elements.map((element) => element.textContent ?? ""));
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0] ?? "") as { "@graph": { "@type": string }[] };
    expect(data["@graph"].map((node) => node["@type"])).toEqual(["Person", "ProfessionalService"]);
    expect(scripts[0]).not.toMatch(/TODO|Review|Rating/);
  });
}

test("the default sharing image is served as a 1200 × 630 PNG", async ({ request }) => {
  const response = await request.get("/og/og-default.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  const png = await response.body();
  // The PNG's IHDR chunk: width, then height, as 32-bit big-endian integers.
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});

test("the sitemap lists every listed page, and the robots file points to it", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const locs = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(([, loc]) => loc);
  expect(locs).toEqual(
    pages.filter(({ key }) => isListed(key)).map(({ path }) => `${site}${path}`),
  );

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${site}/sitemap.xml`);
});

test("the web manifest names the site", async ({ request }) => {
  const manifest = await request.get("/site.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({ name: "Sekoya Solutions" });
});

for (const { locale, missing, heading, links } of [
  {
    locale: "fr",
    missing: "/page-inexistante",
    heading: "Cette page a pris racine ailleurs.",
    links: [
      ["Accueil", "/"],
      ["Offres", "/offres"],
      ["Me contacter", "/contact"],
    ],
  },
  {
    locale: "en",
    missing: "/en/missing-page",
    heading: "This page has taken root elsewhere.",
    links: [
      ["Home", "/en"],
      ["Services", "/en/services"],
      ["Contact me", "/en/contact"],
    ],
  },
] as const) {
  test(`an unknown address under the ${locale} pages gets the ${locale} 404 page`, async ({
    page,
  }) => {
    const response = await page.goto(missing);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    const nav = page.getByRole("main").getByRole("navigation");
    for (const [name, href] of links) {
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
  });
}
