/**
 * The content collections (ADR 0004): long copy lives here, one entry per
 * language, named after the language (`fr.json`, `en.json`). French
 * typography is applied when an entry is read (src/i18n/content.ts).
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { type ContactSubject, contactSubjects } from "./content/contact-subjects";
import { type ProjectCategory, projectCategories } from "./content/project-categories";
import { contactChannels } from "./lib/contact-channels";

/** A text, which may hold `[TODO: …]` placeholders (ADR 0007). */
const text = z.string().trim().min(1);

/** An anchor on a page: the id of the element it scrolls to. */
const anchor = z.string().regex(/^[a-z0-9-]+$/);

/**
 * A link to a page of the site: `page` is a key of src/i18n/routes.ts, and
 * `hash` an optional anchor on that page. A link to the contact page may
 * preselect a subject (src/content/contact-subjects.ts). Until the page
 * exists, the link is not shown.
 */
const pageLink = z.object({
  page: z.string().min(1),
  hash: anchor.optional(),
  subject: z.enum(contactSubjects).optional(),
});

/** A placeholder alone, `[TODO: …]`, for a fact still to provide (ADR 0007). */
const placeholder = z.string().regex(/^\[TODO:[^\]]*\]$/);

/** A link to another site, over HTTPS. */
const https = z.url({ protocol: /^https$/ });

/** A call to action to a page of the site, shown once that page exists. */
const action = pageLink.extend({
  label: text,
  variant: z.enum(["primary", "ghost"]),
});

/** The icons a card can show (src/components/ui/Icon.astro). */
const icon = z.enum(["unlock", "layers", "bolt", "search", "rescue", "shield", "eye", "target"]);

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
              /** The project's page, `project/<slug>`: the card links there once it exists. */
              page: z.string().min(1),
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
      /** The Malt profile, from src/content/company. */
      malt: z.object({ label: text, variant: z.enum(["primary", "ghost"]) }),
      /** The direct links, from src/content/company. */
      links: z.array(z.enum(["email", "github", "linkedin"])).min(1),
    }),
  }),
});

const offers = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/offers" }),
  schema: z.object({
    eyebrow: text,
    title: text,
    lead: text,
    labels: z.object({ forWho: text, deliverables: text }),
    items: z
      .array(
        z.object({
          /** The card's anchor, which the home page's offers teaser links to. */
          id: anchor,
          icon,
          title: text,
          duration: text,
          forWho: text,
          deliverables: z.array(text).min(1),
          action,
        }),
      )
      .length(3)
      .refine((items) => new Set(items.map(({ id }) => id)).size === items.length, {
        message: "Two offers have the same id",
      }),
    steps: z.object({
      title: text,
      items: z.array(z.object({ title: text, text })).length(3),
    }),
    quiz: z.object({ title: text, text, action }),
  }),
});

/**
 * A result of a case study: a measured figure and what it measures, or a
 * placeholder until the figure is provided (ADR 0007), whose label may wait
 * too.
 */
const metric = z
  .object({ value: text, label: text.optional() })
  .refine(({ value, label }) => label !== undefined || /^\[TODO:[^\]]*\]$/.test(value), {
    message: "A figure needs its label",
    path: ["label"],
  });

/**
 * The case studies (ADR 0004), one MDX file per case study and language:
 * `case-studies/<locale>/<slug>.mdx`. The frontmatter holds the facts the
 * template lays out; the body is the context, in Markdown.
 */
const caseStudies = defineCollection({
  loader: glob({ pattern: "*/*.mdx", base: "./src/content/case-studies" }),
  schema: z.object({
    /** The case study's place on the index, from 1. */
    order: z.number().int().positive(),
    company: text,
    role: text,
    period: text,
    title: text,
    actions: z.array(text).min(1),
    results: z.array(metric).min(1),
    /** The technologies, the index card showing the first three. */
    stack: z.array(text).min(1),
  }),
});

/** The case studies' index and the labels of their pages, one entry per language. */
const caseStudiesPage = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/case-studies-page" }),
  schema: z.object({
    eyebrow: text,
    title: text,
    lead: text,
    cv: z.object({
      label: text,
      note: text,
      /** The PDF, a file of public/; until it exists, a placeholder replaces the button. */
      file: z.string().regex(/^\/[a-z0-9-]+\.pdf$/),
    }),
    labels: z.object({
      read: text,
      back: text,
      context: text,
      work: text,
      results: text,
      stack: text,
    }),
    closing: z.object({ title: text, text, actions: z.array(action).min(1) }),
  }),
});

/** A calendar date, `YYYY-MM-DD`, shown as `DD/MM/YYYY` (src/lib/dates.ts). */
const date = z.iso.date();

/**
 * The portfolio's projects (ADR 0004), one MDX file per project and language:
 * `projects/<locale>/<slug>.mdx`. The frontmatter holds what the card and the
 * page lay out; the body is what the project demonstrates, in Markdown. Its
 * figures come from the project's published documentation, each with its
 * date and its source (ADR 0007). Images are paths relative to the file,
 * optimised at build time.
 */
const projects = defineCollection({
  loader: glob({ pattern: "*/*.mdx", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z
      .object({
        /** The project's place in the grid, from 1. */
        order: z.number().int().positive(),
        title: text,
        category: z.enum(projectCategories),
        /** Columns the card spans from 768 px (one on phones). */
        span: z.union([z.literal(1), z.literal(2)]),
        /** The labels above the title, such as "Personal project". */
        badges: z.array(text).min(1),
        /** The chip on the card's picture, such as "Game · Unity". */
        mediaLabel: text,
        summary: text,
        /** The card's picture and the demo's poster; without one, the logo on a glow. */
        cover: z.object({ src: image(), alt: text }).optional(),
        stats: z.array(z.object({ value: text, measuredOn: date, source: https })),
        /**
         * Lighthouse scores, as the project's documentation publishes them, or
         * `this-site`: this site's own, read from the measurement file once it
         * exists (#21), and shown as pending until then.
         */
        lighthouse: z
          .union([
            z.object({
              measuredOn: date,
              source: https,
              scores: z
                .array(z.object({ label: text, score: z.number().int().min(0).max(100) }))
                .min(1),
            }),
            z.literal("this-site"),
          ])
          .optional(),
        stack: z.array(text).min(1),
        /**
         * The project running: a game to play in the page (`play`, embedded
         * after a click, ADR 0005) or a site to visit (`site`).
         */
        demo: z.object({ kind: z.enum(["play", "site"]), url: https }).optional(),
        repo: https,
        screenshots: z.array(z.object({ src: image(), alt: text })),
      })
      .refine(({ demo, cover }) => demo?.kind !== "play" || cover !== undefined, {
        message: "A playable demo needs a cover, its poster",
        path: ["cover"],
      }),
});

/** The portfolio's page and the labels of its cards and project pages, one entry per language. */
const portfolioPage = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/portfolio-page" }),
  schema: z.object({
    eyebrow: text,
    title: text,
    lead: text,
    filters: z.object({
      legend: text,
      all: text,
      note: text,
      /** A label per category (src/content/project-categories.ts). */
      categories: z.object({ game: text, ecommerce: text, web: text }) satisfies z.ZodType<
        Record<ProjectCategory, string>
      >,
    }),
    ghost: z.object({ title: text, text }),
    labels: z.object({
      view: text,
      play: text,
      site: text,
      sourceCode: text,
      lighthouse: text,
      lighthouseSite: text,
      lighthousePending: text,
      figuresAsOf: text,
      measuredOn: text,
      source: text,
      back: text,
      figures: text,
      stack: text,
      demonstrates: text,
      screenshots: text,
    }),
    demo: z.object({
      title: text,
      play: text,
      frameTitle: text,
      notice: text,
      open: text,
      fullscreen: text,
    }),
  }),
});

/**
 * The About page (ADR 0004), one entry per language: who, the values, what
 * clients get, the technologies, how the work is done with AI, and a closing
 * band. The portrait is a photo next to the file once the owner provides one;
 * until then the page shows the brand avatar and a placeholder (ADR 0007).
 */
const about = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/about" }),
  schema: ({ image }) =>
    z.object({
      hero: z.object({
        eyebrow: text,
        title: text,
        bio: z.array(text).min(1),
        portrait: z.object({
          photo: z.object({ src: image(), alt: text }).optional(),
          /** The brand avatar's alternative text, shown until the photo exists. */
          avatarAlt: text,
        }),
      }),
      values: z.object({
        ...sectionHead,
        items: z.array(z.object({ icon, title: text, text })).length(3),
      }),
      bring: z.object({ ...sectionHead, items: z.array(text).min(1) }),
      stack: z.object({
        ...sectionHead,
        groups: z.array(z.object({ title: text, items: z.array(text).min(1) })).min(1),
      }),
      ai: z.object({
        /** The section's anchor, `#ia`, the same in every language. */
        id: anchor,
        ...sectionHead,
        lead: text,
        workflow: z.object({
          title: text,
          steps: z.array(z.object({ title: text, text })).min(2),
        }),
        guardrails: z.object({
          title: text,
          items: z
            .array(
              z.object({
                text,
                links: z.array(z.object({ label: text, href: https })).optional(),
              }),
            )
            .min(1),
        }),
      }),
      closing: z.object({ title: text, text, actions: z.array(action).min(1) }),
    }),
});

/**
 * The company's facts, the same in every language, in one entry
 * (`company/company.json`): its legal details, the ways to reach it, and its
 * host (ADR 0002). The contact links, the contact page and the legal notice
 * read them here. A fact not yet provided is a placeholder (ADR 0007).
 */
const company = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/company" }),
  schema: z.object({
    name: text,
    /** The director of publication, named by the legal notice. */
    director: text,
    capital: text,
    registration: text,
    vat: text,
    address: text,
    phone: text,
    email: z.union([placeholder, z.email()]),
    malt: z.union([placeholder, https]),
    linkedin: z.union([placeholder, https]),
    github: z.union([placeholder, https]),
    host: z.object({ name: text, address: text, phone: text, website: https }),
  }),
});

/** A field of the contact form: its label, and the message shown when it is invalid. */
const formField = z.object({ label: text, error: text });

/**
 * The contact page (ADR 0008), one entry per language: the direct links, the
 * subjects, the form (rendered only when it is on, src/lib/contact-form.ts)
 * and the quiz band, shown once the quiz exists.
 */
const contact = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/contact" }),
  schema: z.object({
    eyebrow: text,
    title: text,
    lead: text,
    channels: z.object({
      title: text,
      items: z.array(z.object({ channel: z.enum(contactChannels), label: text })).min(1),
    }),
    /** A label per subject (src/content/contact-subjects.ts). */
    subjects: z.object({
      audit: text,
      "tech-lead": text,
      sauvetage: text,
      autre: text,
    }) satisfies z.ZodType<Record<ContactSubject, string>>,
    form: z.object({
      title: text,
      note: text,
      optional: text,
      name: formField,
      email: formField,
      company: z.object({ label: text }),
      subject: formField.extend({ choose: text }),
      message: formField,
      consent: formField,
      honeypot: text,
      submit: text,
      privacy: z.object({ text, link: text }),
    }),
    quiz: z.object({ title: text, text, action }),
  }),
});

/** A paragraph of the legal notice, with its links to other sites. */
const legalParagraph = z.object({
  text,
  links: z.array(z.object({ label: text, href: https })).optional(),
});

/**
 * The legal notice (ADR 0008), one entry per language: the labels of the
 * publisher's and the host's facts, which come from src/content/company, then
 * the privacy statement and the credits. The section on the contact form is
 * shown only when the form is on, and names the service that receives the
 * messages (src/lib/contact-form.ts).
 */
const legal = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/legal" }),
  schema: z.object({
    eyebrow: text,
    title: text,
    lead: text,
    publisher: z.object({
      title: text,
      legalForm: text,
      labels: z.object({
        name: text,
        legalForm: text,
        capital: text,
        address: text,
        registration: text,
        vat: text,
        phone: text,
        email: text,
        director: text,
      }),
    }),
    host: z.object({
      title: text,
      labels: z.object({ name: text, address: text, phone: text, website: text }),
    }),
    privacy: z.object({ title: text, items: z.array(legalParagraph).min(1) }),
    form: z.object({
      title: text,
      processor: text,
      items: z.array(legalParagraph).min(1),
    }),
    credits: z.object({ title: text, items: z.array(legalParagraph).min(1) }),
  }),
});

export const collections = {
  about,
  company,
  contact,
  legal,
  home,
  offers,
  caseStudies,
  caseStudiesPage,
  projects,
  portfolioPage,
};
