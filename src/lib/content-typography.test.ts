import { pathToFileURL } from "node:url";
import { markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { contentTypography, isFrenchEntry } from "./content-typography";

const nbsp = " ";
const french = pathToFileURL("/site/src/content/case-studies/fr/entry.mdx");
const english = pathToFileURL("/site/src/content/case-studies/en/entry.mdx");

function render(markdown: string, fileURL: URL | undefined) {
  return markdownToHtml(markdown, {
    hastPlugins: [contentTypography],
    features: { smartPunctuation: false },
    fileURL,
  }).html.trim();
}

describe("isFrenchEntry", () => {
  it("reads the language from the entry's folder", () => {
    expect(isFrenchEntry(french)).toBe(true);
    expect(isFrenchEntry(english)).toBe(false);
    expect(isFrenchEntry(pathToFileURL("/site/fr.mdx"))).toBe(false);
    expect(isFrenchEntry(undefined)).toBe(false);
  });
});

describe("contentTypography", () => {
  it("applies French typography to a French entry only", () => {
    expect(render("Un projet bloqué ? Oui !", french)).toBe(
      `<p>Un projet bloqué${nbsp}? Oui${nbsp}!</p>`,
    );
    expect(render("Blocked ? Yes !", english)).toBe("<p>Blocked ? Yes !</p>");
  });

  it("shows each placeholder as a chip, in any language", () => {
    const chip = '<span class="placeholder">[TODO: contexte]</span>';
    expect(render("Avant [TODO: contexte] après.", french)).toBe(`<p>Avant ${chip} après.</p>`);
    expect(render("[TODO: contexte]", english)).toBe(`<p>${chip}</p>`);
  });

  it("keeps the text of code as written", () => {
    expect(render("`a : [TODO: b]`", french)).toBe("<p><code>a : [TODO: b]</code></p>");
    expect(render("```\na : [TODO: b]\n```", french)).toContain("a : [TODO: b]");
    expect(render("```\na : [TODO: b]\n```", french)).not.toContain("placeholder");
  });

  it("reaches text inside inline elements", () => {
    expect(render("**Résultat :** [TODO: métrique]", french)).toBe(
      `<p><strong>Résultat${nbsp}:</strong> <span class="placeholder">[TODO: métrique]</span></p>`,
    );
  });
});
