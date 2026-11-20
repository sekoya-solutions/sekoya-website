/**
 * The English interface strings (ADR 0004): a faithful translation of fr.ts,
 * with the same keys, which the type enforces.
 */
import type { Dictionary } from "./index";

export const en = {
  layout: {
    skipLink: "Skip to content",
    lightTheme: "Light theme",
  },
  home: {
    title: "Sekoya Solutions",
    description:
      "Sekoya Solutions, freelance Tech Lead: technical audit, Tech Lead engagement, project rescue.",
    measuredOn: "measured on",
    externalLink: "external site",
  },
} satisfies Dictionary;
