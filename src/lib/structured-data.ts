/**
 * The structured data every page carries (schema.org in JSON-LD, read by
 * search engines): the person and the company, with their region and public
 * profiles, never a street address, a price or review markup. A fact that is
 * still a placeholder (ADR 0007) is left out, never published as `[TODO: …]`.
 */
import { splitPlaceholders } from "./placeholders";

export interface StructuredDataFacts {
  /** The site's root, `Astro.site`. */
  readonly site: URL;
  /** The home page in the page's language. */
  readonly home: string;
  readonly person: { readonly name: string; readonly jobTitle: string };
  readonly company: {
    readonly name: string;
    readonly description: string;
    /** The offers' names, in the page's language. */
    readonly offers: readonly string[];
  };
  readonly region: string;
  /** The country: its ISO 3166-1 alpha-2 code and its name. */
  readonly country: { readonly code: string; readonly name: string };
  /** The public profiles' addresses; placeholders are dropped. */
  readonly profiles: readonly string[];
  /** Paths the site serves. */
  readonly logo: string;
  readonly image: string;
}

/** Whether a fact is written, with no placeholder in it. */
export function isProvided(value: string): boolean {
  return value.trim() !== "" && splitPlaceholders(value).every((part) => !part.placeholder);
}

/** The person and the company as one schema.org graph. */
export function structuredData(facts: StructuredDataFacts): Record<string, unknown> {
  const url = (path: string) => new URL(path, facts.site).href;
  const personId = url("/#person");
  const companyId = url("/#company");
  const address = {
    "@type": "PostalAddress",
    addressRegion: facts.region,
    addressCountry: facts.country.code,
  };
  const sameAs = facts.profiles.filter(isProvided);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: facts.person.name,
        jobTitle: facts.person.jobTitle,
        worksFor: { "@id": companyId },
        url: url(facts.home),
        address,
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
      {
        "@type": "ProfessionalService",
        "@id": companyId,
        name: facts.company.name,
        description: facts.company.description,
        url: url(facts.home),
        logo: url(facts.logo),
        image: url(facts.image),
        founder: { "@id": personId },
        areaServed: { "@type": "Country", name: facts.country.name },
        address,
        makesOffer: facts.company.offers.map((name) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name },
        })),
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
    ],
  };
}

/**
 * JSON for a `<script type="application/ld+json">` element: `<`, `>` and `&`
 * escaped, so no text in it can close the element, and the two line
 * separators JavaScript once rejected in strings escaped too.
 */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
