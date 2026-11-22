import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { careerView, ringStyles, styleHash } from "./career-view";

// What the career page (#18) shows of each position, from its content.

const copy = JSON.parse(
  readFileSync(new URL("../../content/career/fr.json", import.meta.url), "utf8"),
);

const views = careerView(copy.positions, copy.labels, "fr");
const bySlug = (slug: string) => {
  const view = views.find((candidate) => candidate.slug === slug);
  if (view === undefined) throw new Error(`${slug} missing`);
  return view;
};

describe("the career's view", () => {
  it("keeps the content's order, the most recent first, with the oldest at the pith", () => {
    expect(views.map((view) => view.slug)).toEqual(
      copy.positions.map((position: { slug: string }) => position.slug),
    );
    expect(views.map((view) => view.band.index)).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it("says each position's period, duration and ring number", () => {
    const sos = bySlug("sos-accessoire");
    expect(sos.period).toBe("05/2022 – 09/2025");
    expect(sos.duration).toBe("3 ans 4 mois");
    expect(sos.ringNumber).toBe("Anneau n° 5 depuis le centre");
    expect(sos.name).toBe("SOS Accessoire, Lead Dev, de 05/2022 à 09/2025");
    expect(sos.band.hairlines).toHaveLength(3);
  });

  it("gives no duration to the current position or one whose dates are placeholders", () => {
    const current = bySlug("sekoya-solutions");
    expect(current.current).toBe(true);
    expect(current.duration).toBeUndefined();
    expect(current.period).toMatch(/ – aujourd'hui$/);
    expect(bySlug("culligan").duration).toBe("4 ans 2 mois");
    // A position whose dates are still placeholders has no duration, and is flagged.
    const pending = careerView(
      copy.positions.map((position: { slug: string }) =>
        position.slug === "culligan"
          ? { ...position, start: "[TODO: début]", end: "[TODO: fin]" }
          : position,
      ),
      copy.labels,
      "fr",
    ).find((view) => view.slug === "culligan");
    expect(pending?.duration).toBeUndefined();
    expect(pending?.band.placeholder).toBe(true);
  });

  it("shades the past bands from the oldest to the most recent", () => {
    expect(
      ["softeam", "enablon", "atos-bull", "culligan", "sos-accessoire"].map(
        (slug) => bySlug(slug).shade,
      ),
    ).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("writes one style rule per position, and the hash of that exact style sheet", () => {
    const css = ringStyles(views);
    for (const view of views) {
      expect(css).toContain(`[data-ring="${view.slug}"]{--ring-start:`);
    }
    expect(css).toContain("--ring-length:0.35");
    expect(styleHash(css)).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
    expect(careerView(copy.positions, copy.labels, "fr")).toEqual(views);
  });
});
