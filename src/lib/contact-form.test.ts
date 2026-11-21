import { describe, expect, it } from "vitest";
import { contactFormAction } from "./contact-form";

const named = { processor: "Form service, 1 street, Paris" };
const pending = { processor: "[TODO: form service]" };

describe("contactFormAction", () => {
  it("keeps the form off when the variable is unset or empty", () => {
    expect(contactFormAction(undefined, pending, false)).toBeUndefined();
    expect(contactFormAction("", pending, false)).toBeUndefined();
    expect(contactFormAction("  ", pending, false)).toBeUndefined();
  });

  it("turns the form on with an HTTPS address once the legal notice names the service", () => {
    expect(contactFormAction("https://forms.example.com/f/abc", named, false)).toBe(
      "https://forms.example.com/f/abc",
    );
  });

  it("fails the build on an address that is not HTTPS, or not a URL", () => {
    expect(() => contactFormAction("http://forms.example.com", named, false)).toThrow(/HTTPS/);
    expect(() => contactFormAction("forms.example.com", named, false)).toThrow(/not a URL/);
  });

  it("fails the build while the legal notice does not name the service, unless placeholders are allowed", () => {
    expect(() => contactFormAction("https://forms.example.com", pending, false)).toThrow(
      /does not name the service/,
    );
    expect(contactFormAction("https://forms.example.com", pending, true)).toBe(
      "https://forms.example.com/",
    );
  });
});
