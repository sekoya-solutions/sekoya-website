import { describe, expect, it } from "vitest";
import { type CaseStudyFacts, caseStudyDifferences } from "./case-study-parity";

function study(slug: string, order: number, changes: Partial<CaseStudyFacts["data"]> = {}) {
  return {
    slug,
    data: {
      order,
      company: slug.toUpperCase(),
      period: "05/2022 – 09/2025",
      actions: ["one", "two"],
      results: [{}],
      stack: ["Next.js", "AWS"],
      ...changes,
    },
  };
}

describe("caseStudyDifferences", () => {
  it("finds none when the facts agree, whatever the translated words", () => {
    const french = [study("a", 1, { actions: ["un", "deux"] }), study("b", 2)];
    expect(caseStudyDifferences(french, [study("b", 2), study("a", 1)])).toEqual([]);
  });

  it("finds a case study missing in a language, or another order", () => {
    expect(caseStudyDifferences([study("a", 1), study("b", 2)], [study("a", 1)])).toHaveLength(1);
    expect(
      caseStudyDifferences([study("a", 1), study("b", 2)], [study("a", 2), study("b", 1)]),
    ).toEqual([
      "the case studies or their order differ: a, b / a, b",
      "a: the orders differ",
      "b: the orders differ",
    ]);
  });

  it("finds a different company, period, stack or number of items", () => {
    const differences = (changes: Partial<CaseStudyFacts["data"]>) =>
      caseStudyDifferences([study("a", 1)], [study("a", 1, changes)]);
    expect(differences({ company: "Other" })).toEqual(["a: the companies differ"]);
    expect(differences({ period: "06/2022 – 09/2025" })).toEqual(["a: the periods differ"]);
    expect(differences({ stack: ["AWS", "Next.js"] })).toEqual(["a: the stacks differ"]);
    expect(differences({ actions: ["one"] })).toEqual(["a: the numbers of actions differ"]);
    expect(differences({ results: [{}, {}] })).toEqual(["a: the numbers of results differ"]);
  });

  it("lets a period's placeholder be translated", () => {
    expect(
      caseStudyDifferences(
        [study("a", 1, { period: "[TODO: période]" })],
        [study("a", 1, { period: "[TODO: period]" })],
      ),
    ).toEqual([]);
  });
});
