import { describe, expect, it } from "vitest";
import { frenchTypography, frenchTypographyDeep, frenchTypographyTree } from "./french-typography";

const nbsp = " ";

describe("frenchTypography", () => {
  it.each([
    ["Audit technique : rapport", `Audit technique${nbsp}: rapport`],
    ["Un ; deux", `Un${nbsp}; deux`],
    ["Votre projet est-il bloqué ?", `Votre projet est-il bloqué${nbsp}?`],
    ["Allons-y !", `Allons-y${nbsp}!`],
    ["« ça rame »", `«${nbsp}ça rame${nbsp}»`],
  ])("puts a no-break space at the mark in %j", (input, expected) => {
    expect(frenchTypography(input)).toBe(expected);
  });

  it("turns a run of spaces, a tab or a narrow no-break space into one no-break space", () => {
    expect(frenchTypography("a  : b")).toBe(`a${nbsp}: b`);
    expect(frenchTypography("a\t?")).toBe(`a${nbsp}?`);
    expect(frenchTypography("a !")).toBe(`a${nbsp}!`);
    expect(frenchTypography("« b »")).toBe(`«${nbsp}b${nbsp}»`);
  });

  it("only replaces an existing space, never adds one", () => {
    expect(frenchTypography("Quoi?")).toBe("Quoi?");
    expect(frenchTypography("«oui»")).toBe("«oui»");
    expect(frenchTypography("à 12:30")).toBe("à 12:30");
    expect(frenchTypography("https://sekoyasolutions.com")).toBe("https://sekoyasolutions.com");
  });

  it("puts the space only before the first of several marks", () => {
    expect(frenchTypography("Vraiment ?!")).toBe(`Vraiment${nbsp}?!`);
  });

  it("keeps line breaks", () => {
    expect(frenchTypography("a\n: b")).toBe("a\n: b");
    expect(frenchTypography("«\nb")).toBe("«\nb");
  });

  it("leaves other spaces alone and is idempotent", () => {
    const once = frenchTypography("Un audit : vite, bien ; « net » !");
    expect(once).toBe(`Un audit${nbsp}: vite, bien${nbsp}; «${nbsp}net${nbsp}»${nbsp}!`);
    expect(frenchTypography(once)).toBe(once);
  });
});

describe("frenchTypographyDeep", () => {
  it("applies the typography through objects and arrays, keeping other values", () => {
    expect(frenchTypographyDeep({ a: ["Oui ?", { b: "« c »" }], d: 2, e: true })).toEqual({
      a: [`Oui${nbsp}?`, { b: `«${nbsp}c${nbsp}»` }],
      d: 2,
      e: true,
    });
  });
});

describe("frenchTypographyTree", () => {
  it("applies the typography to every string and keeps the shape", () => {
    expect(frenchTypographyTree({ a: "Oui ?", b: { c: "« d »", e: "f" } })).toEqual({
      a: `Oui${nbsp}?`,
      b: { c: `«${nbsp}d${nbsp}»`, e: "f" },
    });
  });
});
