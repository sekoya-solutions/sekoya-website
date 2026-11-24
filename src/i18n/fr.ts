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
    /** The footer's link to the testimonials, once one exists. */
    testimonials: "Témoignages",
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
    /** The footer's brand and navigation columns (src/components/layout/Footer.astro). */
    footer: {
      /** Under the logo. */
      tagline: "Tech Lead freelance. Île-de-France · remote · France.",
      /** Before the company's name and its registration, from src/content/company. */
      legalForm: "SASU",
      /** The navigation column's heading. */
      navigationTitle: "Naviguer",
      /** The footer's navigation landmark, read by screen readers only. */
      navigation: "Navigation du pied de page",
      contact: "Contact",
    },
    /** The footer's "this site, measured" column (src/components/layout/SiteScores.astro). */
    scores: {
      title: "Ce site, mesuré",
      source: "Lighthouse mobile",
      pending: "mesure en cours",
      /** Shown under each ring. */
      categories: {
        performance: "Perf.",
        accessibility: "Access.",
        bestPractices: "Pratiques",
        seo: "SEO",
      },
      /** Read by screen readers in place of the short names. */
      categoryNames: {
        performance: "Performance",
        accessibility: "Accessibilité",
        bestPractices: "Bonnes pratiques",
        seo: "SEO",
      },
      builtWith: "Construit avec",
      sourceCode: "Code source",
      /** For a link to another site, read by screen readers only. */
      externalLink: "site externe",
    },
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
  testimonials: {
    title: "Témoignages — Sekoya Solutions",
    description:
      "Ce que disent les clients et les collègues qui ont travaillé avec moi, avec leurs mots et leur accord.",
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
  /** The page served for an address that matches no page (src/components/layout/NotFound.astro). */
  notFound: {
    title: "Page introuvable — Sekoya Solutions",
    description: "Cette adresse ne mène à aucune page du site Sekoya Solutions.",
    eyebrow: "Erreur 404",
    heading: "Cette page a pris racine ailleurs.",
    text: "L'adresse ne correspond à aucune page du site. Ces liens vous remettent sur le chemin :",
    links: "Pages du site",
    home: "Accueil",
  },
  /** The metadata for search engines and social networks (src/lib/structured-data.ts). */
  seo: {
    /** The person's role, in the structured data. */
    jobTitle: "Tech Lead freelance",
    /** The default social sharing image's alternative text. */
    imageAlt: "Sekoya Solutions, Tech Lead freelance",
  },
});
