/**
 * The translated paths (ADR 0004): each page's path in every language, so the
 * language switch and the hreflang alternates point to the equivalent page.
 * Astro's i18n does not translate paths, so this map is kept by hand, except
 * for the case studies and the portfolio's projects, one page each, which
 * come from their files (src/content/slugs.ts): every page must be in it (the
 * base layout fails the build otherwise), and an end-to-end test visits every
 * entry in both languages.
 */
import { subjectParameter } from "../content/contact-subjects";
import { caseStudySlugs, projectSlugs } from "../content/slugs";
import { defaultLocale, type Locale, locales } from "./config";

const pages = {
  home: { fr: "/", en: "/en" },
  offers: { fr: "/offres", en: "/en/services" },
  caseStudies: { fr: "/realisations", en: "/en/case-studies" },
  career: { fr: "/parcours", en: "/en/career" },
  portfolio: { fr: "/portfolio", en: "/en/portfolio" },
  about: { fr: "/a-propos", en: "/en/about" },
  contact: { fr: "/contact", en: "/en/contact" },
  legal: { fr: "/mentions-legales", en: "/en/legal" },
  quiz: { fr: "/quiz", en: "/en/quiz" },
} as const satisfies Record<string, Record<Locale, string>>;

/** A case study's page: `caseStudy/<slug>`, under the case studies' path. */
export type CaseStudyKey = `caseStudy/${string}`;

/** A portfolio project's page: `project/<slug>`, under the portfolio's path. */
export type ProjectKey = `project/${string}`;

export type RouteKey = keyof typeof pages | CaseStudyKey | ProjectKey;

/** The route key of a case study. */
export function caseStudyKey(slug: string): CaseStudyKey {
  return `caseStudy/${slug}`;
}

/** The route key of a portfolio project. */
export function projectKey(slug: string): ProjectKey {
  return `project/${slug}`;
}

/** A page per slug, keyed by `key(slug)`, under a parent page's path in each language. */
function pagesUnder<K extends string>(
  parent: keyof typeof pages,
  slugs: readonly string[],
  key: (slug: string) => K,
): Record<K, Record<Locale, string>> {
  return Object.fromEntries(
    slugs.map((slug) => [
      key(slug),
      Object.fromEntries(locales.map((locale) => [locale, `${pages[parent][locale]}/${slug}`])),
    ]),
  ) as Record<K, Record<Locale, string>>;
}

export const routes: Readonly<Record<RouteKey, Readonly<Record<Locale, string>>>> = {
  ...pages,
  ...pagesUnder("caseStudies", caseStudySlugs(), caseStudyKey),
  ...pagesUnder("portfolio", projectSlugs(), projectKey),
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

/**
 * The address of a link from the content (src/content.config.ts) in a
 * language: its page, then the subject to preselect on the contact page and
 * the anchor. `undefined` until the page exists, so the link is not shown.
 */
export function linkHref(
  link: { page: string; hash?: string; subject?: string },
  locale: Locale,
): string | undefined {
  if (!isRouteKey(link.page)) return undefined;
  const query = link.subject === undefined ? "" : `?${subjectParameter}=${link.subject}`;
  const hash = link.hash === undefined ? "" : `#${link.hash}`;
  return `${pathOf(link.page, locale)}${query}${hash}`;
}

/** The path of a route in a language; a case study or project missing from the map throws. */
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
