import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { isListed, pathOf, type RouteKey, routes } from "../i18n/routes";
import { robots, sitemap } from "./sitemap";

const site = new URL("https://example.com");

/** The `<url>` entries of a sitemap: each address and its alternates. */
function entries(xml: string): { loc: string; links: string[] }[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body = ""]) => ({
    loc: /<loc>(.*?)<\/loc>/.exec(body)?.[1] ?? "",
    links: [...body.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
      ([, hreflang, href]) => `${hreflang} ${href}`,
    ),
  }));
}

describe("sitemap", () => {
  const xml = sitemap(site);
  const listed = (Object.keys(routes) as RouteKey[]).filter(isListed);

  it("is a sitemaps.org URL set with the XHTML namespace for alternates", () => {
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset /);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("lists every listed page once in each language, and nothing else", () => {
    const expected = listed.flatMap((key) =>
      locales.map((locale) => new URL(pathOf(key, locale), site).href),
    );
    expect(entries(xml).map(({ loc }) => loc)).toEqual(expected);
  });

  it("leaves out the 404 page", () => {
    expect(xml).not.toContain("404");
  });

  it("links each page to its translations, then x-default on the French page", () => {
    const offers = entries(xml).find(({ loc }) => loc === "https://example.com/en/services");
    expect(offers?.links).toEqual([
      "fr https://example.com/offres",
      "en https://example.com/en/services",
      "x-default https://example.com/offres",
    ]);
  });
});

describe("robots", () => {
  it("lets every crawler in and gives the sitemap's full address", () => {
    expect(robots(site)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n",
    );
  });
});
