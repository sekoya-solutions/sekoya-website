/**
 * How the testimonials are shown (#23): in a page's language, the author's
 * translation when there is one, or else the original, marked with its
 * language; on the page, the most recent first; on the home page, up to
 * three, the featured ones first.
 */
import type { TestimonialData } from "../content/testimonial-schema";
import type { Locale } from "../i18n/config";

/** A testimonial as a page in one language shows it. */
export interface ShownTestimonial {
  slug: string;
  quote: string;
  role: string;
  /** The language of the quote and the role as shown: the page's, or the original's. */
  lang: Locale;
  /** The original's language, when the quote shown is a translation. */
  translatedFrom: Locale | undefined;
  author: string;
  company: string;
  year: number;
  linkedin: string | undefined;
  featured: boolean;
}

/** The testimonials the home section shows, at most. */
export const homeCount = 3;

/** A testimonial in a page's language. */
export function shownIn(slug: string, data: TestimonialData, locale: Locale): ShownTestimonial {
  const translation = locale === data.lang ? undefined : data.translations?.[locale];
  return {
    slug,
    quote: translation?.quote ?? data.quote,
    role: translation?.role ?? data.role,
    lang: translation === undefined ? data.lang : locale,
    translatedFrom: translation === undefined ? undefined : data.lang,
    author: data.author,
    company: data.company,
    year: data.year,
    linkedin: data.linkedin,
    featured: data.featured ?? false,
  };
}

/** The most recent first; in the same year, by slug, so the order never depends on the file system. */
export function byRecent(a: ShownTestimonial, b: ShownTestimonial): number {
  return b.year - a.year || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
}

/** The home section's testimonials: the featured ones, then the others, each the most recent first. */
export function onHome(list: readonly ShownTestimonial[]): ShownTestimonial[] {
  const recent = [...list].sort(byRecent);
  return [
    ...recent.filter((item) => item.featured),
    ...recent.filter((item) => !item.featured),
  ].slice(0, homeCount);
}

/**
 * The grid's classes for a number of cards: one card alone at a readable
 * width, two side by side from 768 px, three or more in three columns from
 * 1024 px, so no column is left empty beside a lone card. Written out whole
 * so Tailwind finds them.
 */
export function gridClasses(count: number): string {
  if (count <= 1) return "max-w-[760px]";
  if (count === 2) return "md:grid-cols-2 lg:gap-6";
  return "md:grid-cols-2 lg:grid-cols-3 lg:gap-6";
}
