/**
 * The sitemap (sitemaps.org): every page search engines may list, in every
 * language, each with its hreflang alternates, from the route map
 * (src/i18n/routes.ts). Built by hand rather than with @astrojs/sitemap,
 * which pairs languages by identical paths and so cannot link translated
 * paths such as /offres and /en/services (ADR 0004).
 */
import { locales } from "../i18n/config";
import { alternates, isListed, pathOf, type RouteKey, routes } from "../i18n/routes";

/** Text escaped for XML. */
function xml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** The sitemap of the given pages, by default every listed page of the route map. */
export function sitemap(
  site: URL,
  keys: readonly RouteKey[] = (Object.keys(routes) as RouteKey[]).filter(isListed),
): string {
  const entries = keys.flatMap((key) => {
    const links = alternates(key, site)
      .map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${xml(hreflang)}" href="${xml(href)}"/>`,
      )
      .join("\n");
    return locales.map(
      (locale) =>
        `  <url>\n    <loc>${xml(new URL(pathOf(key, locale), site).href)}</loc>\n${links}\n  </url>`,
    );
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

/** The robots file: every page may be crawled, and the sitemap's address. */
export function robots(site: URL): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site).href}\n`;
}
