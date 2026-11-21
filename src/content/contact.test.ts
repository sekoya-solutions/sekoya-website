import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { contactSubjects } from "./contact-subjects";
import { leaves, sharedLeaves } from "./leaves";

// The contact page's copy (src/content/contact) and the legal notice's
// (src/content/legal): every language has the same fields and the same
// links; the contact page labels every subject; and the company's facts
// (src/content/company) name the host that ADR 0002 records.
function read(collection: string, locale: string) {
  return JSON.parse(
    readFileSync(new URL(`./${collection}/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** The fields whose value is the same in every language. */
const sharedFields = /(^|\.)(page|variant|channel|href)$/;

describe.each(["contact", "legal"])("the %s copy", (collection) => {
  const entries = Object.fromEntries(locales.map((locale) => [locale, read(collection, locale)]));

  it.each(locales)("%s has the same fields as French", (locale) => {
    expect([...leaves(entries[locale]).keys()]).toEqual([...leaves(entries.fr).keys()]);
  });

  it.each(locales)("%s has the same links as French", (locale) => {
    expect(sharedLeaves(entries[locale], sharedFields)).toEqual(
      sharedLeaves(entries.fr, sharedFields),
    );
  });
});

describe("the contact page", () => {
  it.each(locales)("labels every subject, in order, in %s", (locale) => {
    expect(Object.keys(read("contact", locale).subjects)).toEqual([...contactSubjects]);
  });
});

describe("the company's facts", () => {
  const company = JSON.parse(
    readFileSync(new URL("./company/company.json", import.meta.url), "utf8"),
  );

  it("name the host and its address, as ADR 0002 records them", () => {
    expect(company.host.name).toBe("Cloudflare, Inc.");
    expect(company.host.address).toBe("101 Townsend St., San Francisco, CA 94107, United States");
  });
});
