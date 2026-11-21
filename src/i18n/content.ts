/**
 * Reading the content collections in a page's language (ADR 0004): each
 * collection has one entry per language, named after it, and French entries
 * get French typography.
 */
import { type CollectionEntry, getCollection, getEntry } from "astro:content";
import { caseStudyDifferences } from "../content/case-study-parity";
import { frenchTypographyDeep } from "../lib/french-typography";
import { type Locale, locales } from "./config";

/** The collections that hold one page's copy, one entry per language. */
type PageCollection = "home" | "offers" | "caseStudiesPage";

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

/** The case studies' index copy and page labels in a language. */
export function caseStudiesPageContent(locale: Locale) {
  return pageContent("caseStudiesPage", locale);
}

/** A case study in a language: its slug, its facts, and its entry, to render its body. */
export interface CaseStudy {
  slug: string;
  data: CollectionEntry<"caseStudies">["data"];
  entry: CollectionEntry<"caseStudies">;
}

/** The case studies of a language as written, in their index order. */
async function caseStudiesAsWritten(locale: Locale): Promise<CaseStudy[]> {
  const prefix = `${locale}/`;
  const entries = await getCollection("caseStudies", ({ id }) => id.startsWith(prefix));
  const studies = entries
    .map((entry) => ({ slug: entry.id.slice(prefix.length), data: entry.data, entry }))
    .sort((a, b) => a.data.order - b.data.order);
  const orders = studies.map(({ data }) => data.order);
  if (new Set(orders).size !== orders.length) {
    throw new Error(`Two ${locale} case studies have the same order`);
  }
  return studies;
}

/**
 * The case studies of a language, in their index order. Each entry's id is
 * `<locale>/<slug>`, from its file (src/content/case-study-slugs.ts). They
 * must say the same in every language (src/content/case-study-parity.ts), or
 * the build fails.
 */
export async function caseStudies(locale: Locale): Promise<CaseStudy[]> {
  const studies = await caseStudiesAsWritten(locale);
  for (const other of locales.filter((candidate) => candidate !== locale)) {
    const differences = caseStudyDifferences(studies, await caseStudiesAsWritten(other));
    if (differences.length > 0) {
      throw new Error(`The ${locale} and ${other} case studies differ: ${differences.join("; ")}`);
    }
  }
  return locale === "fr"
    ? studies.map((study) => ({ ...study, data: frenchTypographyDeep(study.data) }))
    : studies;
}

/** One case study in a language; a missing one fails the build. */
export async function caseStudy(locale: Locale, slug: string): Promise<CaseStudy> {
  const found = (await caseStudies(locale)).find((study) => study.slug === slug);
  if (found === undefined)
    throw new Error(`src/content/case-studies/${locale}/${slug}.mdx is missing`);
  return found;
}
