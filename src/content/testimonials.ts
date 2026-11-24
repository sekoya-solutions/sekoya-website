/**
 * Where the testimonials are (#23): one JSON file per testimonial, in
 * src/content/testimonials, empty at launch. While it holds none, the site
 * has no testimonials section, page, footer link or sitemap entry; the route
 * map (src/i18n/routes.ts) asks `hasTestimonials()`.
 *
 * The feature test build reads a fixture folder instead, named by the
 * `TESTIMONIALS_FOLDER` variable (scripts/feature-test.ts). Read with Node's
 * file system, as src/content/slugs.ts explains, from the project's root.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** The site's testimonials folder, from the project's root. */
export const siteTestimonialsFolder = "src/content/testimonials";

/** The variable that points the build to another folder, for its tests only. */
export const testimonialsFolderVariable = "TESTIMONIALS_FOLDER";

/** The testimonials folder this build reads, from the project's root. */
export function testimonialsFolder(env: NodeJS.ProcessEnv = process.env): string {
  const folder = env[testimonialsFolderVariable]?.trim();
  return folder === undefined || folder === "" ? siteTestimonialsFolder : folder;
}

/** The file that explains the folder's format, the one file that is not a testimonial. */
const readme = "README.md";

/**
 * The testimonials' slugs, from their file names (`<slug>.json`, in
 * lowercase), sorted. A missing folder, or any other file in it, throws, so a
 * mistake fails the build rather than hiding a testimonial.
 */
export function testimonialSlugs(folder = testimonialsFolder(), root = process.cwd()): string[] {
  const path = join(root, folder);
  if (!existsSync(path)) throw new Error(`${folder} is missing`);
  return readdirSync(path)
    .filter((fileName) => fileName !== readme)
    .map((fileName) => {
      const slug = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/.exec(fileName)?.[1];
      if (slug === undefined) {
        throw new Error(`${folder}/${fileName} is not a testimonial (<slug>.json, in lowercase)`);
      }
      return slug;
    })
    .sort();
}

/** Whether the build has at least one testimonial. */
export function hasTestimonials(folder = testimonialsFolder(), root = process.cwd()): boolean {
  return testimonialSlugs(folder, root).length > 0;
}
