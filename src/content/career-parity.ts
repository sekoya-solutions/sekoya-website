/**
 * A position of the career (src/content/career) that has a case study says
 * the same as it: the case study exists in that language, and the company,
 * the role and the period are equal. A role or period still a placeholder on
 * either side is not compared: it waits for its fact. Checked when the career
 * is read (src/i18n/content.ts), so a difference fails the build.
 */
import { formatPeriod, isPlaceholder, numericMonth } from "../lib/career";

/** The facts of a position the check compares. */
export interface PositionFacts {
  slug: string;
  company: string;
  role: string;
  start: string;
  end: string | null;
  caseStudy?: string | undefined;
}

/** The facts of a case study the check compares. */
export interface CaseStudyFacts {
  slug: string;
  data: { company: string; role: string; period: string };
}

const hasPlaceholder = (text: string) => /\[TODO:[^\]]*\]/.test(text);

/** The differences between the career and its case studies; none when they agree. */
export function careerDifferences(
  positions: readonly PositionFacts[],
  studies: readonly CaseStudyFacts[],
): string[] {
  const bySlug = new Map(studies.map((study) => [study.slug, study.data]));
  const differences: string[] = [];
  for (const position of positions) {
    if (position.caseStudy === undefined) continue;
    const study = bySlug.get(position.caseStudy);
    const differ = (what: string) => differences.push(`${position.slug}: ${what} differ`);
    if (study === undefined) {
      differences.push(`${position.slug}: the case study "${position.caseStudy}" is missing`);
      continue;
    }
    if (position.company !== study.company) differ("the companies");
    if (
      !hasPlaceholder(position.role) &&
      !hasPlaceholder(study.role) &&
      position.role !== study.role
    ) {
      differ("the roles");
    }
    const dates = position.end === null ? [position.start] : [position.start, position.end];
    if (!dates.some(isPlaceholder) && !hasPlaceholder(study.period)) {
      // The case study writes the period as the career page shows it; for
      // the current position, only its start is a date.
      const agree =
        position.end === null
          ? study.period.startsWith(`${numericMonth(position.start)} – `)
          : study.period === formatPeriod(position.start, position.end, "");
      if (!agree) differ("the periods");
    }
  }
  return differences;
}
