/**
 * The interface strings of each language (ADR 0004). Components take them
 * from here, never as literals: `const t = translations(Astro.currentLocale)`.
 */
import { type Locale, pageLocale } from "./config";
import { en } from "./en";
import { fr } from "./fr";

/** The shape of fr.ts, with every string widened: the type every dictionary has. */
type Strings<T> = { readonly [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
export type Dictionary = Strings<typeof fr>;

export const dictionaries: Record<Locale, Dictionary> = { fr, en };

/** The strings of a page's language, from `Astro.currentLocale`. */
export function translations(currentLocale: string | undefined): Dictionary {
  return dictionaries[pageLocale(currentLocale)];
}
