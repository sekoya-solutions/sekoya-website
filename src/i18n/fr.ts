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
});
