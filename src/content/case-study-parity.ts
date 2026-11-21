/**
 * A case study says the same in every language (ADR 0004): the facts that do
 * not translate (its place, the company, the period, the stack) are equal, and
 * the lists have as many items. Checked when the case studies are read
 * (src/i18n/content.ts), so a difference fails the build.
 */

/** The facts of a case study the check compares. */
export interface CaseStudyFacts {
  slug: string;
  data: {
    order: number;
    company: string;
    period: string;
    actions: readonly string[];
    results: readonly unknown[];
    stack: readonly string[];
  };
}

const placeholder = /\[TODO:[^\]]*\]/;

/** The differences between two languages' case studies; none when they agree. */
export function caseStudyDifferences(
  first: readonly CaseStudyFacts[],
  second: readonly CaseStudyFacts[],
): string[] {
  const bySlug = new Map(second.map((study) => [study.slug, study.data]));
  const differences: string[] = [];
  const slugs = (studies: readonly CaseStudyFacts[]) => studies.map(({ slug }) => slug).join(", ");
  if (slugs(first) !== slugs([...second].sort((a, b) => a.data.order - b.data.order))) {
    differences.push(`the case studies or their order differ: ${slugs(first)} / ${slugs(second)}`);
  }
  for (const { slug, data } of first) {
    const other = bySlug.get(slug);
    if (other === undefined) continue;
    const differ = (what: string) => differences.push(`${slug}: ${what} differ`);
    if (data.order !== other.order) differ("the orders");
    if (data.company !== other.company) differ("the companies");
    // A placeholder's words are translated; a period is not.
    if (!placeholder.test(data.period) && data.period !== other.period) differ("the periods");
    if (data.stack.join("\n") !== other.stack.join("\n")) differ("the stacks");
    if (data.actions.length !== other.actions.length) differ("the numbers of actions");
    if (data.results.length !== other.results.length) differ("the numbers of results");
  }
  return differences;
}
