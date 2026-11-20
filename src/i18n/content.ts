/**
 * Reading the content collections in a page's language (ADR 0004): each
 * collection has one entry per language, named after it, and French entries
 * get French typography.
 */
import { getEntry } from "astro:content";
import { frenchTypographyDeep } from "../lib/french-typography";
import type { Locale } from "./config";

/** The home page's copy in a language; a missing entry fails the build. */
export async function homeContent(locale: Locale) {
  const entry = await getEntry("home", locale);
  if (entry === undefined) throw new Error(`src/content/home/${locale}.json is missing`);
  return locale === "fr" ? frenchTypographyDeep(entry.data) : entry.data;
}
