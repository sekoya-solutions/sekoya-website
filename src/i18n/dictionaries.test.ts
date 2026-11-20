import { describe, expect, it } from "vitest";
import { languages, locales, pageLocale } from "./config";
import { dictionaries, translations } from "./index";

/** Every string of a dictionary, by its dotted key. */
function flatten(tree: object, prefix = ""): Map<string, string> {
  const strings = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === "string") strings.set(`${prefix}${key}`, value);
    else for (const entry of flatten(value, `${prefix}${key}.`)) strings.set(...entry);
  }
  return strings;
}

describe("the dictionaries", () => {
  const french = flatten(dictionaries.fr);

  it.each(locales)("%s has the same keys as French, none of them empty", (locale) => {
    const strings = flatten(dictionaries[locale]);
    expect([...strings.keys()]).toEqual([...french.keys()]);
    for (const [key, value] of strings) expect(value.trim(), key).not.toBe("");
  });

  it("French has no breakable space before « : ; ? ! » » or after « « »", () => {
    for (const [key, value] of french) {
      expect(value, key).not.toMatch(/ [:;?!»]|« /);
    }
  });
});

describe("the languages", () => {
  it("name every language in itself, with its code", () => {
    expect(languages).toEqual({
      fr: { code: "FR", name: "Français" },
      en: { code: "EN", name: "English" },
    });
  });

  it("reject an unknown page locale", () => {
    expect(pageLocale("en")).toBe("en");
    expect(() => pageLocale(undefined)).toThrow("Unknown page locale");
    expect(() => translations("de")).toThrow("Unknown page locale: de");
  });
});
