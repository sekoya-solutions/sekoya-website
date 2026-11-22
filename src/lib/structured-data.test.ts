import { describe, expect, it } from "vitest";
import {
  isProvided,
  type StructuredDataFacts,
  scriptJson,
  structuredData,
} from "./structured-data";

const facts: StructuredDataFacts = {
  site: new URL("https://example.com"),
  home: "/en",
  person: { name: "Jane Doe", jobTitle: "Freelance Tech Lead" },
  company: {
    name: "Example",
    description: "What the company does.",
    offers: ["Technical audit", "Project rescue"],
  },
  region: "Île-de-France",
  country: { code: "FR", name: "France" },
  profiles: ["[TODO: LinkedIn URL]", "https://github.com/example"],
  logo: "/icon-512.png",
  image: "/og/og-default.png",
};

/** Every node of the graph, by type. */
function nodes(data: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const graph = data["@graph"] as Record<string, unknown>[];
  return Object.fromEntries(graph.map((node) => [node["@type"] as string, node]));
}

describe("structuredData", () => {
  const data = structuredData(facts);
  const { Person: person, ProfessionalService: company } = nodes(data);

  it("describes the person and the company, linked to each other", () => {
    expect(data["@context"]).toBe("https://schema.org");
    expect(person).toMatchObject({
      "@id": "https://example.com/#person",
      name: "Jane Doe",
      jobTitle: "Freelance Tech Lead",
      url: "https://example.com/en",
      worksFor: { "@id": "https://example.com/#company" },
    });
    expect(company).toMatchObject({
      "@id": "https://example.com/#company",
      name: "Example",
      description: "What the company does.",
      url: "https://example.com/en",
      logo: "https://example.com/icon-512.png",
      image: "https://example.com/og/og-default.png",
      founder: { "@id": "https://example.com/#person" },
      areaServed: { "@type": "Country", name: "France" },
    });
  });

  it("lists the offers as services, with no price", () => {
    expect(company?.makesOffer).toEqual([
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Technical audit" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Project rescue" } },
    ]);
    expect(JSON.stringify(data)).not.toMatch(/price/i);
  });

  it("gives the region and the country, never a street address", () => {
    const address = {
      "@type": "PostalAddress",
      addressRegion: "Île-de-France",
      addressCountry: "FR",
    };
    expect(person?.address).toEqual(address);
    expect(company?.address).toEqual(address);
    expect(JSON.stringify(data)).not.toMatch(/streetAddress|postalCode|telephone/);
  });

  it("leaves out the profiles still to provide", () => {
    expect(person?.sameAs).toEqual(["https://github.com/example"]);
    expect(company?.sameAs).toEqual(["https://github.com/example"]);
    expect(JSON.stringify(data)).not.toContain("TODO");
  });

  it("has no sameAs when no profile is provided", () => {
    const { Person: alone } = nodes(structuredData({ ...facts, profiles: ["[TODO: URL]"] }));
    expect(alone).not.toHaveProperty("sameAs");
  });

  it("has no review markup", () => {
    expect(JSON.stringify(data)).not.toMatch(/Review|Rating/);
  });
});

describe("isProvided", () => {
  it("accepts a written fact and rejects a placeholder or an empty value", () => {
    expect(isProvided("https://github.com/example")).toBe(true);
    expect(isProvided("[TODO: URL LinkedIn]")).toBe(false);
    expect(isProvided("https://[TODO: domaine]/")).toBe(false);
    expect(isProvided(" ")).toBe(false);
  });
});

describe("scriptJson", () => {
  it("writes JSON that no text in it can end the script element with", () => {
    const json = scriptJson({ text: "</script><script>alert(1)</script> & \u2028" });
    expect(json).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(json)).toEqual({ text: "</script><script>alert(1)</script> & \u2028" });
  });
});
