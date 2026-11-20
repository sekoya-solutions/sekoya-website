import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { logoTokens, themeableSvg } from "./themeable-svg";

const read = (path: string) =>
  readFileSync(new URL(`../assets/logo/${path}`, import.meta.url), "utf8");

// The light logo colours, from the light theme's logo tokens.
const lightTokens = {
  "#16927a": "--logo-canopy",
  "#a8893f": "--logo-gold",
  "#4a6577": "--logo-roots",
};

describe("themeableSvg", () => {
  it.each([
    ["dark/logo-horizontal.svg", "light/logo-horizontal-light.svg"],
    ["dark/logo-full.svg", "light/logo-full-light.svg"],
  ])("gives %s the exact colours of %s in the light theme", (darkFile, lightFile) => {
    expect(themeableSvg(read(darkFile))).toBe(themeableSvg(read(lightFile), lightTokens));
  });

  it("leaves no fixed colour, no id, and labels the SVG with its title", () => {
    const svg = themeableSvg(read("dark/logo-horizontal.svg"));
    expect(svg).not.toMatch(/#[0-9a-f]{6}\b/i);
    expect(svg).not.toMatch(/\sid=/);
    expect(svg).toContain('aria-label="Sekoya Solutions"');
    expect(svg).toContain("<title>Sekoya Solutions</title>");
    for (const token of Object.values(logoTokens)) expect(svg).toContain(`var(${token})`);
  });

  it("refuses a colour that has no token", () => {
    expect(() => themeableSvg('<svg><title>x</title><path fill="#ff0000"/></svg>')).toThrow(
      "#ff0000",
    );
  });

  it("refuses an id reference it cannot keep", () => {
    expect(() => themeableSvg('<svg><title>x</title><use href="#a"/></svg>')).toThrow();
  });
});
