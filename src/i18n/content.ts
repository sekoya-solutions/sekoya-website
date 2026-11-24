/**
 * Reading the content collections in a page's language (ADR 0004): each
 * collection has one entry per language, named after it, and French entries
 * get French typography.
 */
import { type CollectionEntry, getCollection, getEntry } from "astro:content";
import { careerDifferences } from "../content/career-parity";
import { caseStudyDifferences } from "../content/case-study-parity";
import { projectDifferences } from "../content/project-parity";
import { testimonialSlugs } from "../content/testimonials";
import { frenchTypographyDeep } from "../lib/french-typography";
import { byRecent, type ShownTestimonial, shownIn } from "../lib/testimonials";
import { type Locale, locales } from "./config";

/** The collections that hold one page's copy, one entry per language. */
type PageCollection =
  | "home"
  | "offers"
  | "caseStudiesPage"
  | "portfolioPage"
  | "about"
  | "contact"
  | "legal"
  | "quiz"
  | "testimonialsPage";

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

/** The contact page's copy in a language. */
export function contactContent(locale: Locale) {
  return pageContent("contact", locale);
}

/** The legal notice's copy in a language. */
export function legalContent(locale: Locale) {
  return pageContent("legal", locale);
}

/**
 * The company's facts (src/content/company), the same in every language:
 * names, numbers and addresses, so no French typography.
 */
export async function companyFacts() {
  const entry = await getEntry("company", "company");
  if (entry === undefined) throw new Error("src/content/company/company.json is missing");
  return entry.data;
}

/** The quiz's copy, questions and levels in a language. */
export function quizContent(locale: Locale) {
  return pageContent("quiz", locale);
}

/** The offers page's copy in a language. */
export function offersContent(locale: Locale) {
  return pageContent("offers", locale);
}

/**
 * The About page's copy in a language. In French, the portrait's photo keeps
 * the metadata the build gave it, untouched; its alternative text is typeset.
 */
export async function aboutContent(locale: Locale) {
  const entry = await getEntry("about", locale);
  if (entry === undefined) throw new Error(`src/content/about/${locale}.json is missing`);
  const data: CollectionEntry<"about">["data"] = entry.data;
  if (locale !== "fr") return data;
  const { photo, ...portrait } = data.hero.portrait;
  const typeset = frenchTypographyDeep({ ...data, hero: { ...data.hero, portrait } });
  return {
    ...typeset,
    hero: {
      ...typeset.hero,
      portrait: {
        ...typeset.hero.portrait,
        photo: photo === undefined ? undefined : { ...photo, alt: frenchTypographyDeep(photo.alt) },
      },
    },
  };
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
 * `<locale>/<slug>`, from its file (src/content/slugs.ts). They
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

/**
 * The career page's copy and positions in a language (#18). A position with
 * a case study must agree with it (src/content/career-parity.ts), or the
 * build fails.
 */
export async function careerContent(locale: Locale) {
  const entry = await getEntry("career", locale);
  if (entry === undefined) throw new Error(`src/content/career/${locale}.json is missing`);
  const data: CollectionEntry<"career">["data"] = entry.data;
  const differences = careerDifferences(data.positions, await caseStudiesAsWritten(locale));
  if (differences.length > 0) {
    throw new Error(`The ${locale} career and case studies differ: ${differences.join("; ")}`);
  }
  return locale === "fr" ? frenchTypographyDeep(data) : data;
}

/** The portfolio's copy and the labels of its cards and project pages in a language. */
export function portfolioPageContent(locale: Locale) {
  return pageContent("portfolioPage", locale);
}

/** A portfolio project in a language: its slug, its facts, and its entry, to render its body. */
export interface Project {
  slug: string;
  data: CollectionEntry<"projects">["data"];
  entry: CollectionEntry<"projects">;
}

/** The projects of a language as written, in their grid order. */
async function projectsAsWritten(locale: Locale): Promise<Project[]> {
  const prefix = `${locale}/`;
  const entries = await getCollection("projects", ({ id }) => id.startsWith(prefix));
  const projects = entries
    .map((entry) => ({ slug: entry.id.slice(prefix.length), data: entry.data, entry }))
    .sort((a, b) => a.data.order - b.data.order);
  const orders = projects.map(({ data }) => data.order);
  if (new Set(orders).size !== orders.length) {
    throw new Error(`Two ${locale} projects have the same order`);
  }
  return projects;
}

/**
 * French typography on a project's texts. Its images keep the metadata the
 * build gave them, untouched; their alternative texts are typeset.
 */
function typesetProject(data: Project["data"]): Project["data"] {
  const { cover, screenshots, ...texts } = data;
  return {
    ...frenchTypographyDeep(texts),
    cover: cover === undefined ? undefined : { ...cover, alt: frenchTypographyDeep(cover.alt) },
    screenshots: screenshots.map((shot) => ({ ...shot, alt: frenchTypographyDeep(shot.alt) })),
  };
}

/**
 * The portfolio's projects in a language, in their grid order. Each entry's
 * id is `<locale>/<slug>`, from its file (src/content/slugs.ts). They must say
 * the same in every language (src/content/project-parity.ts), or the build
 * fails.
 */
export async function projects(locale: Locale): Promise<Project[]> {
  const written = await projectsAsWritten(locale);
  for (const other of locales.filter((candidate) => candidate !== locale)) {
    const differences = projectDifferences(written, await projectsAsWritten(other));
    if (differences.length > 0) {
      throw new Error(`The ${locale} and ${other} projects differ: ${differences.join("; ")}`);
    }
  }
  return locale === "fr"
    ? written.map((project) => ({ ...project, data: typesetProject(project.data) }))
    : written;
}

/** One portfolio project in a language; a missing one fails the build. */
export async function project(locale: Locale, slug: string): Promise<Project> {
  const found = (await projects(locale)).find((candidate) => candidate.slug === slug);
  if (found === undefined) throw new Error(`src/content/projects/${locale}/${slug}.mdx is missing`);
  return found;
}

/** The testimonials page's and home section's copy in a language. */
export function testimonialsPageContent(locale: Locale) {
  return pageContent("testimonialsPage", locale);
}

/**
 * The testimonials in a page's language, the most recent first
 * (src/lib/testimonials.ts); none while the folder holds none. The
 * collection is read only then, since Astro warns about an empty one, and it
 * must hold every file of the folder, which the route map reads
 * (src/content/testimonials.ts), or the build fails. French texts get French
 * typography; names stay as written.
 */
export async function testimonials(locale: Locale): Promise<ShownTestimonial[]> {
  const slugs = testimonialSlugs();
  if (slugs.length === 0) return [];
  const entries = await getCollection("testimonials");
  const ids = entries.map(({ id }) => id).sort();
  if (ids.join() !== slugs.join()) {
    throw new Error(
      `The testimonials collection (${ids.join(", ")}) differs from its folder (${slugs.join(", ")})`,
    );
  }
  return entries
    .map(({ id, data }) => shownIn(id, data, locale))
    .map((item) =>
      item.lang === "fr"
        ? { ...item, ...frenchTypographyDeep({ quote: item.quote, role: item.role }) }
        : item,
    )
    .sort(byRecent);
}
