/**
 * The English interface strings (ADR 0004): a faithful translation of fr.ts,
 * with the same keys, which the type enforces.
 */
import type { Dictionary } from "./index";

export const en = {
  layout: {
    skipLink: "Skip to content",
    lightTheme: "Light theme",
    legalNotice: "Legal notice",
    /** The footer's link to the quiz. */
    quiz: "Self-assessment",
    /** The footer's link to the testimonials, once one exists. */
    testimonials: "Testimonials",
    navigation: "Main navigation",
    menu: "Menu",
    nav: {
      offers: "Services",
      caseStudies: "Case studies",
      career: "Career",
      portfolio: "Portfolio",
      about: "About",
    },
    contact: "Contact me",
    footer: {
      tagline: "Freelance Tech Lead. Île-de-France · remote · France.",
      legalForm: "SASU",
      navigationTitle: "Navigate",
      navigation: "Footer navigation",
      contact: "Contact",
    },
    scores: {
      title: "This site, measured",
      source: "Lighthouse mobile",
      pending: "measurement pending",
      categories: {
        performance: "Perf.",
        accessibility: "Access.",
        bestPractices: "Practices",
        seo: "SEO",
      },
      categoryNames: {
        performance: "Performance",
        accessibility: "Accessibility",
        bestPractices: "Best practices",
        seo: "SEO",
      },
      builtWith: "Built with",
      sourceCode: "Source code",
      externalLink: "external site",
    },
  },
  home: {
    title: "Sekoya Solutions",
    description:
      "Sekoya Solutions, freelance Tech Lead: technical audit, Tech Lead engagement, project rescue.",
    measuredOn: "measured on",
    externalLink: "external site",
  },
  offers: {
    title: "Services — Sekoya Solutions",
    description:
      "Three offers to get a project moving again: technical audit, Tech Lead or Lead Dev engagement, project rescue.",
  },
  caseStudies: {
    title: "Case studies — Sekoya Solutions",
    description: "Three case studies: the context, what I did, the result.",
    titleSuffix: "— Case studies — Sekoya Solutions",
    cvMissing: "[TODO: CV (PDF) to provide]",
  },
  portfolio: {
    title: "Portfolio — Sekoya Solutions",
    description:
      "Public projects you can open, play and read: code, architecture decisions and measurements.",
    titleSuffix: "— Portfolio — Sekoya Solutions",
    externalLink: "external site",
  },
  testimonials: {
    title: "Testimonials — Sekoya Solutions",
    description:
      "What the clients and colleagues who worked with me say, in their own words and with their consent.",
  },
  career: {
    title: "Career — Sekoya Solutions",
    description:
      "My career as the rings of a tree trunk: one ring per position, from the oldest to the most recent.",
  },
  about: {
    title: "About — Sekoya Solutions",
    description:
      "Who I am, my values, what I bring to my clients, my stack, and how I work with AI.",
    photoMissing: "[TODO: photo to provide]",
    externalLink: "external site",
  },
  contact: {
    title: "Contact — Sekoya Solutions",
    description:
      "Let's talk about your project: by email, on Malt, LinkedIn or GitHub. I reply personally.",
    externalLink: "external site",
  },
  quiz: {
    title: "Is your project stuck? — Sekoya Solutions",
    description:
      "A 10-question self-assessment: a blocking score and your three priorities. Everything is computed in your browser.",
  },
  legal: {
    title: "Legal notice — Sekoya Solutions",
    description:
      "The site's publisher and host, and what it does with your data: no cookie, no audience measurement, no third-party script.",
    externalLink: "external site",
  },
  notFound: {
    title: "Page not found — Sekoya Solutions",
    description: "This address leads to no page of the Sekoya Solutions website.",
    eyebrow: "Error 404",
    heading: "This page has taken root elsewhere.",
    text: "The address matches no page of the site. These links put you back on the path:",
    links: "Site pages",
    home: "Home",
  },
  seo: {
    jobTitle: "Freelance Tech Lead",
    imageAlt: "Sekoya Solutions, freelance Tech Lead",
  },
} satisfies Dictionary;
