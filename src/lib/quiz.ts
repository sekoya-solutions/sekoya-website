/**
 * The self-assessment quiz's scoring (ADR 0005), a pure function the island
 * calls and the unit tests cover. Each question has three answers worth 0, 1
 * or 2 points, 2 being the most exposed; the score is their sum. Nothing here
 * stores or sends anything.
 */

/** An answer's points: 0, 1 or 2, 2 being the most exposed. */
export type Points = 0 | 1 | 2;

/** A level: the scores it covers, from `min` to `max` included. */
export interface LevelRange {
  readonly min: number;
  readonly max: number;
}

/** A question worth listing among the priorities: its place in the quiz and its points. */
export interface Priority {
  /** The question's index, from 0. */
  readonly question: number;
  readonly points: 1 | 2;
}

/** A finished quiz's result. */
export interface QuizResult<L extends LevelRange> {
  readonly score: number;
  readonly max: number;
  readonly level: L;
  readonly priorities: readonly Priority[];
}

/** How many priorities the result lists at most. */
export const priorityCount = 3;

/** The highest score of a quiz with this many questions. */
export function maxScore(questions: number): number {
  return questions * 2;
}

/** The score: the sum of the answers' points. */
export function totalScore(points: readonly Points[]): number {
  return points.reduce<number>((sum, value) => sum + value, 0);
}

/** The level whose range holds the score; the levels must cover every score. */
export function levelOf<L extends LevelRange>(score: number, levels: readonly L[]): L {
  const level = levels.find(({ min, max }) => min <= score && score <= max);
  if (level === undefined) throw new RangeError(`No level covers the score ${score}`);
  return level;
}

/**
 * The questions to work on first: the highest points first, ties in the
 * quiz's order, at most `priorityCount`. An answer worth 0 is never listed.
 */
export function priorities(points: readonly Points[]): Priority[] {
  return points
    .flatMap((value, question) => (value === 0 ? [] : [{ question, points: value }]))
    .sort((a, b) => b.points - a.points || a.question - b.question)
    .slice(0, priorityCount);
}

/** A finished quiz's score, level and priorities, from each answer's points in the quiz's order. */
export function quizResult<L extends LevelRange>(
  points: readonly Points[],
  levels: readonly L[],
): QuizResult<L> {
  const score = totalScore(points);
  return {
    score,
    max: maxScore(points.length),
    level: levelOf(score, levels),
    priorities: priorities(points),
  };
}

/**
 * Whether levels cover every score from 0 to `max` once, in order, with no
 * gap or overlap: the content's check.
 */
export function levelsCover(levels: readonly LevelRange[], max: number): boolean {
  let next = 0;
  for (const { min, max: last } of levels) {
    if (min !== next || last < min) return false;
    next = last + 1;
  }
  return next === max + 1;
}
