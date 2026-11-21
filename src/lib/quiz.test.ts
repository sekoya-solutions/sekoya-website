import { describe, expect, it } from "vitest";
import { levelOf, levelsCover, type Points, priorities, quizResult, totalScore } from "./quiz";

const levels = [
  { id: "low", min: 0, max: 6 },
  { id: "mid", min: 7, max: 13 },
  { id: "high", min: 14, max: 20 },
] as const;

/** Ten answers adding up to `score`: as many 2s as fit, then a 1, then 0s. */
function answersFor(score: number): Points[] {
  return Array.from({ length: 10 }, (_, index) => {
    const left = score - index * 2;
    return (left >= 2 ? 2 : left === 1 ? 1 : 0) as Points;
  });
}

describe("quizResult", () => {
  it.each([
    [0, "low"],
    [6, "low"],
    [7, "mid"],
    [13, "mid"],
    [14, "high"],
    [20, "high"],
  ])("puts a score of %i in the %s level", (score, level) => {
    const result = quizResult(answersFor(score), levels);
    expect(result.score).toBe(score);
    expect(result.max).toBe(20);
    expect(result.level.id).toBe(level);
  });

  it("lists no priority when every answer is worth 0", () => {
    const result = quizResult(answersFor(0), levels);
    expect(result.priorities).toEqual([]);
  });
});

describe("priorities", () => {
  it("lists the highest points first, then ties in the quiz's order, three at most", () => {
    expect(priorities([1, 2, 0, 1, 2, 2, 2, 0, 1, 0])).toEqual([
      { question: 1, points: 2 },
      { question: 4, points: 2 },
      { question: 5, points: 2 },
    ]);
  });

  it("completes with answers worth 1, in the quiz's order", () => {
    expect(priorities([0, 1, 0, 2, 0, 0, 1, 0, 1, 0])).toEqual([
      { question: 3, points: 2 },
      { question: 1, points: 1 },
      { question: 6, points: 1 },
    ]);
  });

  it("never lists an answer worth 0, so fewer than three may remain", () => {
    expect(priorities([0, 0, 0, 0, 1, 0, 0, 0, 0, 0])).toEqual([{ question: 4, points: 1 }]);
  });
});

describe("totalScore and levelOf", () => {
  it("adds the points", () => {
    expect(totalScore([2, 1, 0, 2])).toBe(5);
    expect(totalScore([])).toBe(0);
  });

  it("refuses a score no level covers", () => {
    expect(() => levelOf(21, levels)).toThrow(RangeError);
    expect(() => levelOf(-1, levels)).toThrow(RangeError);
  });
});

describe("levelsCover", () => {
  it("accepts levels that cover every score once, in order", () => {
    expect(levelsCover(levels, 20)).toBe(true);
  });

  it("rejects a gap, an overlap, a short end or levels out of order", () => {
    expect(
      levelsCover(
        [
          { min: 0, max: 6 },
          { min: 8, max: 20 },
        ],
        20,
      ),
    ).toBe(false);
    expect(
      levelsCover(
        [
          { min: 0, max: 7 },
          { min: 7, max: 20 },
        ],
        20,
      ),
    ).toBe(false);
    expect(
      levelsCover(
        [
          { min: 0, max: 6 },
          { min: 7, max: 19 },
        ],
        20,
      ),
    ).toBe(false);
    expect(
      levelsCover(
        [
          { min: 7, max: 20 },
          { min: 0, max: 6 },
        ],
        20,
      ),
    ).toBe(false);
    expect(levelsCover([{ min: 1, max: 20 }], 20)).toBe(false);
  });
});
