/**
 * The site's languages (ADR 0004): French, the default, at the root, and
 * English under /en/. astro.config.mjs reads this file for Astro's i18n.
 */

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale = "fr" satisfies Locale;

/** Each language as the switch shows it: its code, and its name in itself. */
export const languages: Record<Locale, { code: string; name: string }> = {
  fr: { code: "FR", name: "Français" },
  en: { code: "EN", name: "English" },
};

export function isLocale(value: unknown): value is Locale {
  return (locales as readonly unknown[]).includes(value);
}

/** The locale of a page, from `Astro.currentLocale`; an unknown one fails the build. */
export function pageLocale(value: string | undefined): Locale {
  if (!isLocale(value)) throw new Error(`Unknown page locale: ${value}`);
  return value;
}
