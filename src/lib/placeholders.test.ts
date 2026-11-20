import { describe, expect, it } from "vitest";
import { splitPlaceholders } from "./placeholders";

describe("splitPlaceholders", () => {
  it("separates each placeholder from the plain text around it", () => {
    expect(splitPlaceholders("Sekoya · [TODO: région] · Remote")).toEqual([
      { text: "Sekoya · ", placeholder: false },
      { text: "[TODO: région]", placeholder: true },
      { text: " · Remote", placeholder: false },
    ]);
  });

  it("handles a text that is only a placeholder, or has several", () => {
    expect(splitPlaceholders("[TODO: a]")).toEqual([{ text: "[TODO: a]", placeholder: true }]);
    expect(splitPlaceholders("[TODO: a][TODO: b]").map((part) => part.placeholder)).toEqual([
      true,
      true,
    ]);
  });

  it("keeps a text without placeholder whole", () => {
    expect(splitPlaceholders("Défiler")).toEqual([{ text: "Défiler", placeholder: false }]);
  });
});
