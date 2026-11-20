import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { alternates, isRouteKey, normalizePath, routeOf, routes } from "./routes";

const entries = Object.entries(routes).flatMap(([key, paths]) =>
  locales.map((locale) => ({ key, locale, path: paths[locale] })),
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

describe("isRouteKey", () => {
  it("accepts a page of the map and rejects one that does not exist yet", () => {
    expect(isRouteKey("home")).toBe(true);
    expect(isRouteKey("contact")).toBe(false);
    expect(isRouteKey("toString")).toBe(false);
  });
});
