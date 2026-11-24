/**
 * A testimonial's schema (#23), one JSON file per testimonial
 * (src/content/testimonials.ts). Apart from src/content.config.ts so the unit
 * tests can check it.
 *
 * The quote is the author's own words, in the language they wrote it in
 * (`lang`). A translation the author approved may be added for another
 * language, with the role in that language; pages in that language show it,
 * marked as translated, and the others show the original. A testimonial is
 * published only with its author's consent: `consent` must be `true`. It
 * holds no placeholder: a testimonial is never invented (ADR 0007).
 */
import { z } from "astro/zod";
import { locales } from "../i18n/config";

/** The longest quote, in characters. */
export const maxQuoteLength = 280;

const text = z.string().trim().min(1);
const quote = text.max(maxQuoteLength);

/** Whether a value, at any depth, holds a `[TODO: …]` placeholder. */
function hasPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return value.includes("[TODO");
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  if (value !== null && typeof value === "object") return Object.values(value).some(hasPlaceholder);
  return false;
}

export const testimonialSchema = z
  .object({
    /** The language the author wrote the quote in. */
    lang: z.enum(locales),
    quote,
    author: text,
    /** The author's role, in the quote's language. */
    role: text,
    company: text,
    /** The year of the work the testimonial is about. */
    year: z.number().int().min(1990).max(2100),
    /** The author's public LinkedIn profile. */
    linkedin: z.url({ protocol: /^https$/, hostname: /^([a-z]{2,3}\.)?linkedin\.com$/ }).optional(),
    /** The author agreed to its publication; without it, the entry is invalid. */
    consent: z.literal(true),
    /** Shown first in the home section. */
    featured: z.boolean().optional(),
    /** Translations the author approved, by language: the quote and the role. */
    translations: z.partialRecord(z.enum(locales), z.object({ quote, role: text })).optional(),
  })
  .strict()
  .refine((data) => data.translations?.[data.lang] === undefined, {
    message: "A translation is in another language than the quote's",
    path: ["translations"],
  })
  .refine((data) => !hasPlaceholder(data), {
    message: "A testimonial holds no placeholder: it is never invented",
  });

export type TestimonialData = z.infer<typeof testimonialSchema>;
