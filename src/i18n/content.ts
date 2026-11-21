/**
 * Reading the content collections in a page's language (ADR 0004): each
 * collection has one entry per language, named after it, and French entries
 * get French typography.
 */
import { type CollectionEntry, getEntry } from "astro:content";
import { frenchTypographyDeep } from "../lib/french-typography";
import type { Locale } from "./config";

/** The collections that hold one page's copy, one entry per language. */
type PageCollection = "home" | "offers";

/** A page's copy in a language; a missing entry fails the build. */
async function pageContent<C extends PageCollection>(
  collection: C,
  locale: Locale,
): Promise<CollectionEntry<C>["data"]> {
  const entry = await getEntry(collection, locale);
  if (entry === undefined) throw new Error(`src/content/${collection}/${locale}.json is missing`);
  const data: CollectionEntry<C>["data"] = entry.data;
  return locale === "fr" ? frenchTypographyDeep(data) : data;
}

/** The home page's copy in a language. */
export function homeContent(locale: Locale) {
  return pageContent("home", locale);
}

/** The offers page's copy in a language. */
export function offersContent(locale: Locale) {
  return pageContent("offers", locale);
}
