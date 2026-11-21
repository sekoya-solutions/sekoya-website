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
  legal: {
    title: "Legal notice — Sekoya Solutions",
    description:
      "The site's publisher and host, and what it does with your data: no cookie, no audience measurement, no third-party script.",
    externalLink: "external site",
  },
} satisfies Dictionary;
