/**
 * The French interface strings (ADR 0004), the source language. Long copy
 * lives in content collections. French typography is applied here, so the
 * strings are written with ordinary spaces.
 */
import { frenchTypographyTree } from "../lib/french-typography";

export const fr = frenchTypographyTree({
  layout: {
    skipLink: "Aller au contenu",
    lightTheme: "Thème clair",
  },
  home: {
    title: "Sekoya Solutions",
    description:
      "Sekoya Solutions, Tech Lead freelance : audit technique, mission Tech Lead, sauvetage de projet.",
    measuredOn: "mesuré le",
    externalLink: "site externe",
  },
  offers: {
    title: "Offres — Sekoya Solutions",
    description:
      "Trois offres pour remettre un projet en mouvement : audit technique, mission Tech Lead ou Lead Dev, sauvetage de projet.",
  },
  caseStudies: {
    title: "Réalisations — Sekoya Solutions",
    description: "Trois études de cas : le contexte, ce que j'ai fait, le résultat.",
    /** After a case study's company, in its page's title. */
    titleSuffix: "— Réalisations — Sekoya Solutions",
    /** Shown in place of the CV button until the PDF is added (ADR 0007). */
    cvMissing: "[TODO: CV (PDF) à fournir]",
  },
});
