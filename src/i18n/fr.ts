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
    legalNotice: "Mentions légales",
    /** The footer's link to the quiz. */
    quiz: "Auto-diagnostic",
    /** The header's navigation landmark, read by screen readers only. */
    navigation: "Navigation principale",
    /** The button that opens the navigation below 1280 px, read by screen readers only. */
    menu: "Menu",
    /** The header's links to the main pages (src/i18n/navigation.ts). */
    nav: {
      offers: "Offres",
      caseStudies: "Réalisations",
      career: "Parcours",
      portfolio: "Portfolio",
      about: "À propos",
    },
    contact: "Me contacter",
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
  portfolio: {
    title: "Portfolio — Sekoya Solutions",
    description:
      "Des projets publics que vous pouvez ouvrir, jouer et lire : code, décisions d'architecture et mesures.",
    /** After a project's title, in its page's title. */
    titleSuffix: "— Portfolio — Sekoya Solutions",
    /** For a link to another site, read by screen readers only. */
    externalLink: "site externe",
  },
  career: {
    title: "Parcours — Sekoya Solutions",
    description:
      "Mon parcours en anneaux de tronc d'arbre : un anneau par poste, du plus ancien au plus récent.",
  },
  about: {
    title: "À propos — Sekoya Solutions",
    description:
      "Qui je suis, mes valeurs, ce que j'apporte à mes clients, ma stack, et comment je travaille avec l'IA.",
    /** Shown under the brand avatar until the photo is added (ADR 0007). */
    photoMissing: "[TODO: photo à fournir]",
    /** For a link to another site, read by screen readers only. */
    externalLink: "site externe",
  },
  contact: {
    title: "Contact — Sekoya Solutions",
    description:
      "Parlons de votre projet : par email, sur Malt, LinkedIn ou GitHub. Je réponds personnellement.",
    /** For a link to another site, read by screen readers only. */
    externalLink: "site externe",
  },
  quiz: {
    title: "Votre projet est-il bloqué ? — Sekoya Solutions",
    description:
      "Un auto-diagnostic en 10 questions : un score de blocage et vos trois priorités. Tout se calcule dans votre navigateur.",
  },
  legal: {
    title: "Mentions légales — Sekoya Solutions",
    description:
      "L'éditeur et l'hébergeur du site, et ce qu'il fait de vos données : aucun cookie, aucune mesure d'audience, aucun script tiers.",
    /** For a link to another site, read by screen readers only. */
    externalLink: "site externe",
  },
});
