/**
 * The content collections (ADR 0004): long copy lives here, one entry per
 * language, named after the language (`fr.json`, `en.json`). French
 * typography is applied when an entry is read (src/i18n/content.ts).
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** A text, which may hold `[TODO: …]` placeholders (ADR 0007). */
const text = z.string().trim().min(1);

/**
 * A link to a page of the site: `page` is a key of src/i18n/routes.ts, and
 * `hash` an optional anchor on that page. Until the page exists, the link is
 * not shown.
 */
const pageLink = z.object({
  page: z.string().min(1),
  hash: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

/** A call to action to a page of the site, shown once that page exists. */
const action = pageLink.extend({
  label: text,
  variant: z.enum(["primary", "ghost"]),
});

/** A call to action to another site, shown with an external-link icon. */
const externalAction = z.object({
  label: text,
  href: z.url({ protocol: /^https$/ }),
  variant: z.enum(["primary", "ghost"]),
});

/** The icons a card can show (src/components/home/Icon.astro). */
const icon = z.enum(["unlock", "layers", "bolt", "search", "rescue"]);

/** A section's heading: its eyebrow and its title. */
const sectionHead = { eyebrow: text, title: text };

const home = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/home" }),
  schema: z.object({
    hero: z.object({
      eyebrow: text,
      title: z.object({ lead: text, rest: text }),
      lead: text,
      actions: z.array(action),
      trust: z.array(text).min(1),
      scrollHint: text,
    }),
    values: z.object({
      ...sectionHead,
      items: z.array(z.object({ icon, title: text, text })).length(3),
    }),
    offers: z.object({
      ...sectionHead,
      more: text,
      items: z
        .array(z.object({ icon, title: text, duration: text, text, link: pageLink }))
        .length(3),
    }),
    featuredCase: z.object({
      ...sectionHead,
      role: text,
      period: text,
      steps: z.object({
        context: z.object({ label: text, text }),
        work: z.object({ label: text, text }),
        results: z.object({ label: text, items: z.array(text).min(1) }),
      }),
      action,
      map: z.object({
        label: text,
        centre: z.object({ name: text, role: text }),
        systems: z.array(z.object({ name: text, role: text })).length(6),
      }),
    }),
    portfolio: z.object({
      ...sectionHead,
      projects: z
        .array(
          z
            .object({
              title: text,
              text,
              measuredOn: z.iso.date().optional(),
              image: z.enum(["sekoya-transit", "sekoya-parts", "logo"]),
              alt: z.string(),
              stack: z.array(text).min(1),
            })
            .refine((project) => project.image === "logo" || project.alt.trim() !== "", {
              message: "A screenshot needs its alternative text",
              path: ["alt"],
            }),
        )
        .length(3),
    }),
    quiz: z.object({
      ...sectionHead,
      lead: text,
      action,
      sample: z
        .object({
          score: z.number().int().nonnegative(),
          max: z.number().int().positive(),
          label: text,
        })
        .refine(({ score, max }) => score <= max, {
          message: "The sample score is above its maximum",
          path: ["score"],
        }),
    }),
    contact: z.object({
      ...sectionHead,
      lead: text,
      action,
      external: externalAction,
      links: z
        .array(
          z.object({
            icon: z.enum(["email", "github", "linkedin"]),
            label: text,
            href: z.url({ protocol: /^(https|mailto)$/ }).optional(),
          }),
        )
        .min(1),
    }),
  }),
});

export const collections = { home };
