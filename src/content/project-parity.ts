/**
 * A portfolio project says the same in every language (ADR 0004): the facts
 * that do not translate (its place and size in the grid, its category, its
 * figures' dates and sources, its scores, stack and links) are equal, and the
 * lists have as many items. Checked when the projects are read
 * (src/i18n/content.ts), so a difference fails the build.
 */

/** The facts of a project the check compares. */
export interface ProjectFacts {
  slug: string;
  data: {
    order: number;
    category: string;
    span: number;
    badges: readonly string[];
    cover?: unknown;
    stats: readonly { measuredOn: string; source: string }[];
    lighthouse?:
      | "this-site"
      | {
          measuredOn: string;
          source: string;
          scores: readonly { score: number }[];
        };
    stack: readonly string[];
    demo?: { kind: string; url: string };
    repo: string;
    screenshots: readonly unknown[];
  };
}

/** The facts of a project's scores that every language shares. */
function scoresOf(lighthouse: ProjectFacts["data"]["lighthouse"]): string {
  if (lighthouse === undefined || lighthouse === "this-site") return String(lighthouse);
  const scores = lighthouse.scores.map(({ score }) => score).join(" ");
  return `${lighthouse.measuredOn} ${lighthouse.source} ${scores}`;
}

/** The differences between two languages' projects; none when they agree. */
export function projectDifferences(
  first: readonly ProjectFacts[],
  second: readonly ProjectFacts[],
): string[] {
  const bySlug = new Map(second.map((project) => [project.slug, project.data]));
  const differences: string[] = [];
  const slugs = (projects: readonly ProjectFacts[]) => projects.map(({ slug }) => slug).join(", ");
  if (slugs(first) !== slugs([...second].sort((a, b) => a.data.order - b.data.order))) {
    differences.push(`the projects or their order differ: ${slugs(first)} / ${slugs(second)}`);
  }
  for (const { slug, data } of first) {
    const other = bySlug.get(slug);
    if (other === undefined) continue;
    const differ = (what: string) => differences.push(`${slug}: ${what} differ`);
    if (data.order !== other.order) differ("the orders");
    if (data.category !== other.category) differ("the categories");
    if (data.span !== other.span) differ("the spans");
    if (data.badges.length !== other.badges.length) differ("the numbers of badges");
    if ((data.cover === undefined) !== (other.cover === undefined)) differ("the covers");
    const stats = (project: ProjectFacts["data"]) =>
      project.stats.map(({ measuredOn, source }) => `${measuredOn} ${source}`).join("\n");
    if (stats(data) !== stats(other)) differ("the figures' dates or sources");
    if (scoresOf(data.lighthouse) !== scoresOf(other.lighthouse)) differ("the Lighthouse scores");
    if (data.stack.join("\n") !== other.stack.join("\n")) differ("the stacks");
    if (`${data.demo?.kind} ${data.demo?.url}` !== `${other.demo?.kind} ${other.demo?.url}`) {
      differ("the demos");
    }
    if (data.repo !== other.repo) differ("the repositories");
    if (data.screenshots.length !== other.screenshots.length) differ("the numbers of screenshots");
  }
  return differences;
}
