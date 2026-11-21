import { describe, expect, it } from "vitest";
import { caseStudySlugs, projectSlugs } from "../content/slugs";
import { locales } from "./config";
import { dictionaries } from "./index";
import { navigationLinks, navigationPages } from "./navigation";
import { caseStudyKey, isRouteKey, pathOf, projectKey, type RouteKey } from "./routes";

describe("the header's navigation", () => {
  it("links the main pages that exist, in order, in the page's language", () => {
    for (const locale of locales) {
      const links = navigationLinks({ key: "home", locale });
      expect(links.map((link) => link.page)).toEqual(navigationPages.filter(isRouteKey));
      for (const link of links) expect(link.href).toBe(pathOf(link.page as RouteKey, locale));
    }
  });

  it("leaves out a page that is not built yet", () => {
    // The career page comes with its own issue: until it is in the route
    // map, it has no link.
    expect(isRouteKey("career")).toBe(false);
    expect(navigationLinks({ key: "home", locale: "fr" }).map((link) => link.page)).not.toContain(
      "career",
    );
    const withoutAbout = (page: string): page is RouteKey => page !== "about" && isRouteKey(page);
    expect(
      navigationLinks({ key: "home", locale: "fr" }, withoutAbout).map((link) => link.page),
    ).toEqual(["offers", "caseStudies", "portfolio"]);
  });

  it("marks the page shown, and nothing on a page outside the navigation", () => {
    const current = (key: RouteKey) =>
      navigationLinks({ key, locale: "en" })
        .filter((link) => link.current !== undefined)
        .map((link) => [link.page, link.current]);
    expect(current("offers")).toEqual([["offers", "page"]]);
    expect(current("about")).toEqual([["about", "page"]]);
    expect(current("home")).toEqual([]);
    expect(current("contact")).toEqual([]);
    expect(current("legal")).toEqual([]);
  });

  it("marks the section of a case study or a project as the current item", () => {
    const current = (key: RouteKey) =>
      navigationLinks({ key, locale: "fr" })
        .filter((link) => link.current !== undefined)
        .map((link) => [link.page, link.current]);
    for (const slug of caseStudySlugs()) {
      expect(current(caseStudyKey(slug))).toEqual([["caseStudies", "true"]]);
    }
    for (const slug of projectSlugs()) {
      expect(current(projectKey(slug))).toEqual([["portfolio", "true"]]);
    }
  });

  it("has a label for every page in every language", () => {
    for (const locale of locales) {
      for (const page of navigationPages) {
        expect(dictionaries[locale].layout.nav[page]).toMatch(/\S/);
      }
    }
  });
});
