import { describe, expect, it } from "vitest";
import { channelLink, hasPlaceholder } from "./contact-channels";

describe("channelLink", () => {
  it("links an email address with mailto and shows it as written", () => {
    expect(channelLink("email", "hello@example.com")).toEqual({
      channel: "email",
      display: "hello@example.com",
      href: "mailto:hello@example.com",
    });
  });

  it("shows a profile's URL without its scheme, www or trailing slash", () => {
    expect(channelLink("malt", "https://www.malt.fr/profile/someone/")).toEqual({
      channel: "malt",
      display: "malt.fr/profile/someone",
      href: "https://www.malt.fr/profile/someone/",
    });
    expect(channelLink("github", "https://github.com/sekoya-solutions").display).toBe(
      "github.com/sekoya-solutions",
    );
  });

  it("shows a value still to provide as its placeholder, with no link", () => {
    expect(channelLink("email", "[TODO: email]")).toEqual({
      channel: "email",
      display: "[TODO: email]",
    });
    expect(channelLink("linkedin", "[TODO: URL LinkedIn]").href).toBeUndefined();
  });
});

describe("hasPlaceholder", () => {
  it("finds a placeholder anywhere in a text", () => {
    expect(hasPlaceholder("Service [TODO: name], Paris")).toBe(true);
    expect(hasPlaceholder("Cloudflare, Inc.")).toBe(false);
  });
});
