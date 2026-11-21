import { describe, expect, it } from "vitest";
import { type CaseStudyFacts, careerDifferences, type PositionFacts } from "./career-parity";

// The career page's positions (#18) agree with their case studies.

const position = (changes: Partial<PositionFacts> = {}): PositionFacts => ({
  slug: "sos",
  company: "SOS Accessoire",
  role: "Lead Dev",
  start: "2022-05",
  end: "2025-09",
  caseStudy: "sos-accessoire",
  ...changes,
});

const study = (changes: Partial<CaseStudyFacts["data"]> = {}): CaseStudyFacts => ({
  slug: "sos-accessoire",
  data: { company: "SOS Accessoire", role: "Lead Dev", period: "05/2022 – 09/2025", ...changes },
});

describe("careerDifferences", () => {
  it("finds none when the position and its case study agree", () => {
    expect(careerDifferences([position()], [study()])).toEqual([]);
  });

  it("ignores a position with no case study", () => {
    expect(careerDifferences([position({ caseStudy: undefined, role: "Other" })], [])).toEqual([]);
  });

  it("finds a missing case study", () => {
    expect(careerDifferences([position()], [])).toEqual([
      'sos: the case study "sos-accessoire" is missing',
    ]);
  });

  it("finds a different company, role or period", () => {
    expect(careerDifferences([position({ company: "SOS" })], [study()])).toEqual([
      "sos: the companies differ",
    ]);
    expect(careerDifferences([position({ role: "Tech Lead" })], [study()])).toEqual([
      "sos: the roles differ",
    ]);
    expect(careerDifferences([position({ end: "2025-08" })], [study()])).toEqual([
      "sos: the periods differ",
    ]);
    expect(careerDifferences([position()], [study({ period: "05/2022 – 10/2025" })])).toEqual([
      "sos: the periods differ",
    ]);
  });

  it("compares only the start of the current position", () => {
    const current = position({ end: null });
    expect(careerDifferences([current], [study({ period: "05/2022 – today" })])).toEqual([]);
    expect(careerDifferences([current], [study({ period: "06/2022 – today" })])).toEqual([
      "sos: the periods differ",
    ]);
  });

  it("waits for a role or a period still a placeholder on either side", () => {
    expect(careerDifferences([position({ role: "[TODO: rôle]" })], [study()])).toEqual([]);
    expect(careerDifferences([position()], [study({ role: "[TODO: rôle]" })])).toEqual([]);
    expect(careerDifferences([position({ start: "[TODO: début]" })], [study()])).toEqual([]);
    expect(careerDifferences([position()], [study({ period: "[TODO: période]" })])).toEqual([]);
  });
});
