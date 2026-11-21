// What `npm run lighthouse` measures (ADR 0007): one French page per
// template, each run several times on mobile. The English pages use the same
// templates. scripts/lighthouse.test.ts checks that each path is a page of
// the site.

/** One page per template. */
export const measuredPages = [
  "/",
  "/offres",
  "/realisations",
  "/realisations/sos-accessoire",
  "/parcours",
  "/portfolio",
  "/portfolio/sekoya-transit",
  "/a-propos",
  "/quiz",
  "/contact",
  "/mentions-legales",
] as const;

/** The runs per page; the median of each category is kept. */
export const runsPerPage = 3;

/** The port the build is served on while it is measured. */
export const lighthousePort = 4324;

/** The file the measurement is written to. */
export const measurementFile = "src/data/lighthouse.json";
