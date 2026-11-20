import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { heroScene, rightOnlyTraces, traceNodeDelay, traceNodes, traces } from "./hero-scene";

const logo = readFileSync(
  new URL("../assets/animated/logo-9c-animated.themeable.svg", import.meta.url),
  "utf8",
);

/** The segments of a path made of M, H, V and L commands, as [dx, dy]. */
function segments(d: string): [number, number][] {
  const result: [number, number][] = [];
  let x = 0;
  let y = 0;
  for (const [, command, args] of d.matchAll(/([MHVL])\s*([-\d.\s]+)/g)) {
    const values = args.trim().split(/\s+/).map(Number);
    const [nx, ny] =
      command === "H" ? [values[0], y] : command === "V" ? [x, values[0]] : [values[0], values[1]];
    if (command !== "M") result.push([nx - x, ny - y]);
    [x, y] = [nx, ny];
  }
  return result;
}

describe("the circuit extension", () => {
  it.each([...traces, ...rightOnlyTraces].map((trace) => [trace.d]))(
    "%s has only horizontal, vertical and 45° segments",
    (d) => {
      for (const [dx, dy] of segments(d)) {
        expect(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy), `${dx}, ${dy}`).toBe(true);
      }
    },
  );

  it("draws between 1.40 and 1.75 s, in 0.8 to 1.4 s", () => {
    for (const { delay, duration } of [...traces, ...rightOnlyTraces]) {
      expect(delay).toBeGreaterThanOrEqual(1.4);
      expect(delay).toBeLessThanOrEqual(1.75);
      expect(duration).toBeGreaterThanOrEqual(0.8);
      expect(duration).toBeLessThanOrEqual(1.4);
    }
  });

  it("shows its nodes from 1.90 s, 80 ms apart", () => {
    expect(traceNodes.map((_, index) => traceNodeDelay(index))).toEqual([
      1.9, 1.98, 2.06, 2.14, 2.22, 2.3, 2.38, 2.46, 2.54, 2.62,
    ]);
  });
});

describe("heroScene", () => {
  const { svg, css } = heroScene(logo);

  it("is decorative and adds no id, no inline style and no fixed colour to the page", () => {
    expect(svg).toMatch(/^<svg [^>]*aria-hidden="true"/);
    expect(svg).not.toMatch(/\sid=|\sstyle=|<style|<title|#[0-9a-f]{6}\b/i);
    expect(svg).toContain("var(--logo-roots)");
    expect(svg).toContain("var(--logo-gold)");
    expect(svg).toContain("var(--logo-canopy)");
  });

  it("keeps the logo's parts, named by their former ids", () => {
    expect(svg).toMatch(/class="anim-trunk logo-trunk"/);
    expect(svg).toMatch(/class="logo-ring"/);
    for (const chevron of [1, 2, 3]) {
      expect(svg).toMatch(new RegExp(String.raw`class="chevron logo-chevron-${chevron} hs-\d+"`));
    }
    expect(svg.match(/class="root"/g)).toHaveLength(11);
    expect(svg.match(/class="node"/g)).toHaveLength(11);
  });

  it("turns each element's timings into a class with one rule", () => {
    const rule = (name: string) => {
      const timing = new RegExp(String.raw`class="[^"]*\b${name}\b[^"]*\b(hs-\d+)"`).exec(svg)?.[1];
      return new RegExp(String.raw`\.hero-scene \.${timing}\{([^}]*)\}`).exec(css)?.[1];
    };
    expect(rule("logo-root-Z")).toBe("--d:0.55s;--dur:0.67s;--nd:1.10s");
    expect(rule("logo-root-BR")).toBe("--d:0.63s;--dur:0.85s;--nd:1.36s");
    expect(rule("logo-chevron-3")).toBe("--d:1.70s");
  });

  it("has every trace on both sides, the right-only trace and every node", () => {
    expect(svg.match(/class="trace hs-\d+"/g)).toHaveLength(traces.length * 2 + 1);
    expect(svg.match(/class="trace-node hs-\d+"/g)).toHaveLength(traceNodes.length * 2);
    expect(svg).toContain('transform="translate(1024 0) scale(-1 1)"');
  });

  it("sends the idle dot along the right-only trace", () => {
    expect(css).toContain(`.hero-scene .scene-dot{offset-path:path("${rightOnlyTraces[0].d}")}`);
  });

  it("refuses an inline style that is not a custom property", () => {
    const changed = logo.replace('style="--d:2.00s"', 'style="opacity:0.5"');
    expect(() => heroScene(changed)).toThrow("more than custom properties");
  });

  it("refuses a colour that has no token", () => {
    expect(() => heroScene(logo.replace('fill="#22c08a"', 'fill="#ff0000"'))).toThrow("#ff0000");
  });
});
