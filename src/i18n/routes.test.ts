import { describe, expect, it } from "vitest";
import { caseStudySlugs, projectSlugs } from "../content/slugs";
import { hasTestimonials } from "../content/testimonials";
import { locales } from "./config";
import {
  alternates,
  caseStudyKey,
  isListed,
  isRouteKey,
  linkHref,
  normalizePath,
  pathOf,
  projectKey,
  type RouteKey,
  routeOf,
  routes,
  routesFor,
  testimonialsPaths,
} from "./routes";

const entries = (Object.keys(routes) as RouteKey[]).flatMap((key) =>
  locales.map((locale) => ({ key, locale, path: pathOf(key, locale) })),
);

describe("the route map", () => {
  it("writes every path from the root, without a trailing slash or .html", () => {
    for (const { path } of entries) {
      expect(path).toMatch(/^\//);
      expect(normalizePath(path)).toBe(path);
    }
  });

  it("puts French at the root and English under /en", () => {
    for (const { locale, path } of entries) {
      if (locale === "en") expect(path).toMatch(/^\/en(?:\/|$)/);
      else expect(path).not.toMatch(/^\/en(?:\/|$)/);
    }
  });

  it("gives every page a path of its own", () => {
    const paths = entries.map(({ path }) => path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("finds each entry back from its path", () => {
    for (const { key, locale, path } of entries) expect(routeOf(path)).toEqual({ key, locale });
  });
});

describe("routeOf", () => {
  it("accepts the built and served forms of a path", () => {
    for (const path of ["/", "/index.html", "/en", "/en/", "/en.html", "/en/index.html"]) {
      expect(routeOf(path).key).toBe("home");
    }
    expect(routeOf("/en.html").locale).toBe("en");
    expect(routeOf("/index.html").locale).toBe("fr");
  });

  it("throws for a page missing from the map", () => {
    expect(() => routeOf("/nowhere")).toThrow("/nowhere is missing from src/i18n/routes.ts");
  });
});

describe("alternates", () => {
  it("lists every language with full URLs, then x-default on the French page", () => {
    expect(alternates("home", new URL("https://sekoyasolutions.com"))).toEqual([
      { hreflang: "fr", href: "https://sekoyasolutions.com/" },
      { hreflang: "en", href: "https://sekoyasolutions.com/en" },
      { hreflang: "x-default", href: "https://sekoyasolutions.com/" },
    ]);
  });
});

describe("isListed", () => {
  it("keeps the 404 page out of search engines and lists every other page", () => {
    expect(isListed("notFound")).toBe(false);
    expect(isListed("home")).toBe(true);
    expect(isListed("offers")).toBe(true);
  });
});

describe("isRouteKey", () => {
  it("accepts a page of the map and rejects one that does not exist yet", () => {
    expect(isRouteKey("home")).toBe(true);
    expect(isRouteKey("not-a-page")).toBe(false);
    expect(isRouteKey("toString")).toBe(false);
  });
});

describe("linkHref", () => {
  it("writes a page's path, then the subject to preselect, then the anchor", () => {
    expect(linkHref({ page: "offers", hash: "audit" }, "fr")).toBe("/offres#audit");
    expect(linkHref({ page: "contact", subject: "sauvetage" }, "en")).toBe(
      "/en/contact?sujet=sauvetage",
    );
    expect(linkHref({ page: "about" }, "fr")).toBe("/a-propos");
  });

  it("gives no address to a page that does not exist yet", () => {
    expect(linkHref({ page: "not-a-page" }, "fr")).toBeUndefined();
  });
});

describe("the case studies' routes", () => {
  it("give each case study file a page under the index, in every language", () => {
    expect(isRouteKey("caseStudies")).toBe(true);
    for (const slug of caseStudySlugs()) {
      const key = caseStudyKey(slug);
      expect(isRouteKey(key)).toBe(true);
      expect(routes[key]).toEqual({
        fr: `/realisations/${slug}`,
        en: `/en/case-studies/${slug}`,
      });
    }
  });

  it("have no page for a case study without a file", () => {
    expect(isRouteKey(caseStudyKey("nowhere"))).toBe(false);
    expect(() => pathOf(caseStudyKey("nowhere"), "fr")).toThrow(
      'The page "caseStudy/nowhere" is missing from src/i18n/routes.ts',
    );
  });
});

describe("the portfolio's routes", () => {
  it("give each project file a page under the portfolio, in every language", () => {
    expect(routes.portfolio).toEqual({ fr: "/portfolio", en: "/en/portfolio" });
    for (const slug of projectSlugs()) {
      const key = projectKey(slug);
      expect(isRouteKey(key)).toBe(true);
      expect(routes[key]).toEqual({ fr: `/portfolio/${slug}`, en: `/en/portfolio/${slug}` });
    }
  });

  it("have no page for a project without a file", () => {
    expect(isRouteKey(projectKey("nowhere"))).toBe(false);
  });
});

describe("the testimonials page (#23)", () => {
  // The page exists only once a testimonial does: the map without them has
  // no page, and the site's map follows its folder (src/content/testimonials).
  it("is not a page while no testimonial exists", () => {
    const empty = routesFor({ testimonials: false });
    expect(Object.hasOwn(empty, "testimonials")).toBe(false);
    expect(Object.keys(empty)).toEqual(Object.keys(routes).filter((key) => key !== "testimonials"));
    expect(routesFor({ testimonials: true }).testimonials).toEqual(testimonialsPaths);
  });

  it("is a page of the site exactly when its folder holds a testimonial", () => {
    expect(isRouteKey("testimonials")).toBe(hasTestimonials());
    if (hasTestimonials()) {
      expect(pathOf("testimonials", "fr")).toBe(testimonialsPaths.fr);
      expect(linkHref({ page: "testimonials" }, "en")).toBe(testimonialsPaths.en);
    } else {
      expect(() => pathOf("testimonials", "fr")).toThrow(/testimonials/);
      expect(linkHref({ page: "testimonials" }, "fr")).toBeUndefined();
    }
  });

  it("has a translated path in each language, which no other page uses", () => {
    expect(testimonialsPaths).toEqual({ fr: "/temoignages", en: "/en/testimonials" });
    const others = entries.filter(({ key }) => key !== "testimonials").map(({ path }) => path);
    for (const locale of locales) expect(others).not.toContain(testimonialsPaths[locale]);
  });
});
