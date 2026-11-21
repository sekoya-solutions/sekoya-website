/**
 * The header's and the footer's navigations: the pages in their order, each
 * shown once its page exists in the route map (routes.ts), so the career
 * page's link appeared with that page. The link to the page shown is marked
 * `aria-current="page"`; on a case study or a project's page, the link to
 * its section is marked `aria-current="true"`, the current item of the set.
 */
import { isRouteKey, type PageRoute, pathOf, type RouteKey } from "./routes";

/** The main pages, in the header's order: route keys, some not built yet. */
export const navigationPages = ["offers", "caseStudies", "career", "portfolio", "about"] as const;

export type NavigationPage = (typeof navigationPages)[number];

/** The footer's pages, in its order: the main pages, then the quiz and contact. */
export const footerPages = [...navigationPages, "quiz", "contact"] as const;

export type FooterPage = (typeof footerPages)[number];

/** A link of a navigation, without its label (the dictionaries hold them). */
export interface NavigationLink<Page extends string = NavigationPage> {
  page: Page;
  href: string;
  current: "page" | "true" | undefined;
}

/** The section a route belongs to: a case study's, a project's, or its own. */
function sectionOf(key: RouteKey): RouteKey {
  if (key.startsWith("caseStudy/")) return "caseStudies";
  if (key.startsWith("project/")) return "portfolio";
  return key;
}

/** How a link to `key` is marked on the page of `route`. */
export function currentOf(key: RouteKey, route: PageRoute): NavigationLink["current"] {
  if (route.key === key) return "page";
  return sectionOf(route.key) === key ? "true" : undefined;
}

/** The links to `pages` that exist, on the page of `route`, in its language. */
function linksOf<Page extends string>(
  pages: readonly Page[],
  route: PageRoute,
  exists: (page: string) => page is RouteKey,
): NavigationLink<Page>[] {
  return pages.flatMap((page) =>
    exists(page)
      ? [{ page, href: pathOf(page, route.locale), current: currentOf(page, route) }]
      : [],
  );
}

/**
 * The header's links on a page, in the page's language. `exists` tells
 * which pages are built; the route map, except in tests.
 */
export function navigationLinks(
  route: PageRoute,
  exists: (page: string) => page is RouteKey = isRouteKey,
): NavigationLink[] {
  return linksOf(navigationPages, route, exists);
}

/** The footer's links on a page, in the page's language; `exists` as above. */
export function footerLinks(
  route: PageRoute,
  exists: (page: string) => page is RouteKey = isRouteKey,
): NavigationLink<FooterPage>[] {
  return linksOf(footerPages, route, exists);
}
