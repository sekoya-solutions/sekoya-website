import { describe, expect, it } from "vitest";
import { type ProjectFacts, projectDifferences } from "./project-parity";

/** A project with every fact set, and the given changes. */
function project(slug: string, changes: Partial<ProjectFacts["data"]> = {}): ProjectFacts {
  return {
    slug,
    data: {
      order: 1,
      category: "game",
      span: 2,
      badges: ["Personal project"],
      cover: {},
      stats: [{ measuredOn: "2026-11-18", source: "https://example.com/a" }],
      lighthouse: {
        measuredOn: "2026-11-17",
        source: "https://example.com/b",
        scores: [{ score: 96 }],
      },
      stack: ["Unity"],
      demo: { kind: "play", url: "https://example.com/demo" },
      repo: "https://example.com/repo",
      screenshots: [{}],
      ...changes,
    },
  };
}

describe("projectDifferences", () => {
  it("finds none when the languages agree, translated words aside", () => {
    const fr = project("a", { badges: ["Projet personnel"] });
    expect(projectDifferences([fr], [project("a")])).toEqual([]);
  });

  it("finds a project missing from a language, or a different order", () => {
    expect(projectDifferences([project("a")], [])).toEqual([
      "the projects or their order differ: a / ",
    ]);
    const first = [project("a"), project("b", { order: 2 })];
    const second = [project("a", { order: 2 }), project("b", { order: 1 })];
    expect(projectDifferences(first, second)).toContain("a: the orders differ");
  });

  it("finds each fact that does not translate", () => {
    const changes: [Partial<ProjectFacts["data"]>, string][] = [
      [{ category: "web" }, "the categories"],
      [{ span: 1 }, "the spans"],
      [{ badges: [] }, "the numbers of badges"],
      [{ cover: undefined }, "the covers"],
      [{ stats: [] }, "the figures' dates or sources"],
      [
        { stats: [{ measuredOn: "2026-11-19", source: "https://example.com/a" }] },
        "the figures' dates or sources",
      ],
      [{ lighthouse: "this-site" }, "the Lighthouse scores"],
      [
        {
          lighthouse: {
            measuredOn: "2026-11-17",
            source: "https://example.com/b",
            scores: [{ score: 97 }],
          },
        },
        "the Lighthouse scores",
      ],
      [{ stack: ["Godot"] }, "the stacks"],
      [{ demo: undefined }, "the demos"],
      [{ demo: { kind: "site", url: "https://example.com/demo" } }, "the demos"],
      [{ repo: "https://example.com/other" }, "the repositories"],
      [{ screenshots: [] }, "the numbers of screenshots"],
    ];
    for (const [change, what] of changes) {
      expect(projectDifferences([project("a")], [project("a", change)])).toEqual([
        `a: ${what} differ`,
      ]);
    }
  });
});
