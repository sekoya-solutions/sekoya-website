import { describe, expect, it } from "vitest";
import { routeOf, routes } from "../src/i18n/routes";
import { measuredPages, runsPerPage } from "./lighthouse-pages";

/** A route's template: a case study's or a project's, or the page's own key. */
function templateOf(key: string): string {
  return key.split("/")[0];
}

describe("the pages Lighthouse measures", () => {
  it("are French pages of the site", () => {
    for (const path of measuredPages) expect(routeOf(path).locale).toBe("fr");
  });

  it("cover each template once", () => {
    const measured = measuredPages.map((path) => templateOf(routeOf(path).key));
    const templates = new Set(Object.keys(routes).map(templateOf));
    expect(new Set(measured).size).toBe(measured.length);
    expect(new Set(measured)).toEqual(templates);
  });

  it("are run an odd number of times, so each has a median", () => {
    expect(runsPerPage % 2).toBe(1);
  });
});
