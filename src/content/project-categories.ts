/**
 * The portfolio's categories, one filter each, in this order. Each has its
 * filter rule in src/components/portfolio/Portfolio.astro and its label in
 * src/content/portfolio-page.
 */
export const projectCategories = ["game", "ecommerce", "web"] as const;

/** A category of the portfolio. */
export type ProjectCategory = (typeof projectCategories)[number];
