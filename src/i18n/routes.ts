/**
 * The translated paths (ADR 0004): each page's path in every language, so the
 * language switch and the hreflang alternates point to the equivalent page.
 * Astro's i18n does not translate paths, so this map is kept by hand, except
 * for the case studies, one page each, which come from their files: every
 * page must be in it (the base layout fails the build otherwise), and an
 * end-to-end test visits every entry in both languages.
 */
import { caseStudySlugs } from "../content/case-study-slugs";
import { defaultLocale, type Locale, locales } from "./config";

const pages = {
  home: { fr: "/", en: "/en" },
  offers: { fr: "/offres", en: "/en/services" },
  caseStudies: { fr: "/realisations", en: "/en/case-studies" },
} as const satisfies Record<string, Record<Locale, string>>;

/** A case study's page: `caseStudy/<slug>`, under the case studies' path. */
export type CaseStudyKey = `caseStudy/${string}`;

export type RouteKey = keyof typeof pages | CaseStudyKey;

/** The route key of a case study. */
export function caseStudyKey(slug: string): CaseStudyKey {
  return `caseStudy/${slug}`;
}

export const routes: Readonly<Record<RouteKey, Readonly<Record<Locale, string>>>> = {
  ...pages,
  ...Object.fromEntries(
    caseStudySlugs().map((slug) => [
      caseStudyKey(slug),
      Object.fromEntries(
        locales.map((locale) => [locale, `${pages.caseStudies[locale]}/${slug}`]),
      ) as Record<Locale, string>,
    ]),
  ),
};

/** Whether a page exists: a key of the route map. */
export function isRouteKey(value: string): value is RouteKey {
  return Object.hasOwn(routes, value);
}

/** A page's route and language. */
export interface PageRoute {
  key: RouteKey;
  locale: Locale;
}

/**
 * The path of a page as the map writes it: no trailing slash and no `.html`,
 * since pages are built as `offres.html` and served at `/offres` (ADR 0001).
 */
export function normalizePath(pathname: string): string {
  const path = pathname.replace(/(?:\/index)?\.html$/, "").replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

/** The route and language of a path; a path missing from the map throws. */
export function routeOf(pathname: string): PageRoute {
  const path = normalizePath(pathname);
  for (const [key, paths] of Object.entries(routes) as [RouteKey, Record<Locale, string>][]) {
    for (const [locale, localePath] of Object.entries(paths) as [Locale, string][]) {
      if (localePath === path) return { key, locale };
    }
  }
  throw new Error(`The page ${pathname} is missing from src/i18n/routes.ts`);
}

/** The path of a route in a language; a case study missing from the map throws. */
export function pathOf(key: RouteKey, locale: Locale): string {
  if (!isRouteKey(key)) throw new Error(`The page "${key}" is missing from src/i18n/routes.ts`);
  return routes[key][locale];
}

/**
 * A route's hreflang alternates, with full URLs as search engines require:
 * one per language, then `x-default`, which points to the French page.
 */
export function alternates(key: RouteKey, site: URL): { hreflang: string; href: string }[] {
  const href = (locale: Locale) => new URL(pathOf(key, locale), site).href;
  return [
    ...locales.map((locale) => ({ hreflang: locale, href: href(locale) })),
    { hreflang: "x-default", href: href(defaultLocale) },
  ];
}
