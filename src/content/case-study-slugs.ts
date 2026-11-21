/**
 * The case studies' slugs, read from their files, so the route map
 * (src/i18n/routes.ts) gets a page for each with no code change (ADR 0004):
 * `src/content/case-studies/<locale>/<slug>.mdx`, one file per language.
 *
 * Read with Node's file system rather than Vite's `import.meta.glob`, since
 * the end-to-end tests, run outside Vite, read the route map too. The path is
 * relative to the project's root, which is where every command runs from (npm
 * scripts, Astro's build, Vitest, Playwright), as for the collections' bases in
 * src/content.config.ts. A missing folder, or a case study missing in one
 * language, throws, so a mistake fails the build rather than dropping a page.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type Locale, locales } from "../i18n/config";

/** The case studies' folder, from the project's root. */
export const caseStudiesFolder = "src/content/case-studies";

/** The slug of a case study file, or undefined for any other file. */
export function slugOf(fileName: string): string | undefined {
  return /^([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/.exec(fileName)?.[1];
}

/** The slugs of one language's folder, sorted; another file in it throws. */
function slugsIn(folder: string): string[] {
  if (!existsSync(folder)) throw new Error(`${folder} is missing`);
  return readdirSync(folder)
    .map((fileName) => {
      const slug = slugOf(fileName);
      if (slug === undefined) {
        throw new Error(`${folder}/${fileName} is not a case study (<slug>.mdx, in lowercase)`);
      }
      return slug;
    })
    .sort();
}

/** The slugs of the case studies, which every language must have. */
export function caseStudySlugs(root = process.cwd()): string[] {
  const [first, ...others] = locales.map((locale: Locale) => ({
    locale,
    slugs: slugsIn(join(root, caseStudiesFolder, locale)),
  }));
  if (first === undefined) throw new Error("No locale is configured");
  for (const other of others) {
    if (other.slugs.join() !== first.slugs.join()) {
      throw new Error(
        `The case studies differ between ${first.locale} (${first.slugs.join(", ")}) and ${other.locale} (${other.slugs.join(", ")})`,
      );
    }
  }
  return first.slugs;
}
