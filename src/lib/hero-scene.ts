/**
 * The hero scene: the animated logo, inlined so that it follows the theme,
 * and the circuit extension, the traces that continue from the logo's root
 * nodes out into the page background. Everything is in the logo's space, a
 * 1024-unit square; the scene's viewBox is wider so the traces can run to the
 * edges of the page.
 *
 * The page's Content Security Policy allows no inline style attribute and no
 * <style> element it has not hashed, so the scene carries neither: each
 * element's timings (`--d`, `--dur`, `--nd`) become a class with one CSS rule,
 * returned apart from the markup. The animations themselves are declared in
 * HeroScene.astro.
 */
import { logoTokens } from "./themeable-svg";

/** A circuit trace: its path, and when and how long it draws, in seconds. */
export interface Trace {
  readonly d: string;
  readonly delay: number;
  readonly duration: number;
}

/**
 * The left side's traces; the right side is their mirror image. Only 90° and
 * 45° segments. The last one is the long upper trace.
 */
export const traces: readonly Trace[] = [
  { d: "M327.6 663.9 H190 L140 713.9 H-140 L-190 763.9 H-640", delay: 1.45, duration: 1.25 },
  {
    d: "M327.5 721.5 H250 L190 781.5 H40 L-20 841.5 H-380 L-430 891.5 H-800",
    delay: 1.5,
    duration: 1.4,
  },
  { d: "M353 781.7 L332 802.7 V905 L302 935 H-120 L-170 985 H-560", delay: 1.4, duration: 1.3 },
  { d: "M405.4 821.7 L384 843.1 V970 L354 1000 H160 L110 1050 H-300", delay: 1.55, duration: 1.2 },
  { d: "M471.5 849.5 V1000 L441.5 1030 H300", delay: 1.45, duration: 0.8 },
  {
    d: "M190 663.9 L140 613.9 H-60 L-110 563.9 H-500 L-550 513.9 H-900",
    delay: 1.75,
    duration: 1.4,
  },
];

/** A trace on the right side only, with no mirror image. */
export const rightOnlyTraces: readonly Trace[] = [
  { d: "M695.4 663.9 H840 L890 613.9 H1120 L1170 563.9 H1500", delay: 1.7, duration: 1.3 },
];

/** The end and corner nodes of the left side's traces, mirrored like them. */
export const traceNodes: readonly (readonly [x: number, y: number])[] = [
  [-640, 763.9],
  [-800, 891.5],
  [-560, 985],
  [-300, 1050],
  [300, 1030],
  [-900, 513.9],
  [140, 713.9],
  [-20, 841.5],
  [332, 802.7],
  [-110, 563.9],
];

/** When the trace nodes appear: one after the other, from 1.90 s, 80 ms apart. */
export function traceNodeDelay(index: number): number {
  return Math.round((1.9 + 0.08 * index) * 100) / 100;
}

/** The trace along which the idle dot travels, once the logo is complete. */
export const dotTrace = rightOnlyTraces[0].d;

/** The scene's viewBox, wide enough for the traces, with the logo on the right. */
export const sceneViewBox = "-1504 -90 2800 1190";

/** The scene's markup, and the CSS rules of its elements' timings. */
export interface HeroScene {
  readonly svg: string;
  readonly css: string;
}

/** Collects the timing rules, one class per element, in the order they are needed. */
class TimingRules {
  readonly #rules: string[] = [];

  /** A class carrying these custom properties, such as `--d: 0.55s`. */
  add(properties: readonly (readonly [name: string, value: string])[]): string {
    const name = `hs-${this.#rules.length}`;
    const body = properties.map(([property, value]) => `${property}:${value}`).join(";");
    this.#rules.push(`.hero-scene .${name}{${body}}`);
    return name;
  }

  get css(): string {
    return this.#rules.join("\n");
  }
}

const attributePattern = /([\w:-]+)="([^"]*)"/g;
const tagPattern = /<([a-z]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/gi;

/**
 * Prepares the logo's `<g class="logo">` group for a page whose policy allows
 * no inline style:
 * - its `<style>` and `<title>` are left out (the scene is decorative);
 * - each `id` becomes a `logo-<id>` class, so the scene adds no id to the page;
 * - each `style` attribute, which may only set custom properties, becomes a
 *   timing class;
 * - each logo colour becomes its theme token, and any other colour throws.
 */
function sceneLogo(svg: string, rules: TimingRules): string {
  const group = /<g class="logo">[\s\S]*<\/g>(?=\s*<\/svg>\s*$)/.exec(svg)?.[0];
  if (group === undefined) throw new Error('The logo has no <g class="logo"> group');
  return group.replace(
    tagPattern,
    (_tag, name: string, attributes: string, selfClosing: string) => {
      const classes: string[] = [];
      const kept: string[] = [];
      for (const [, attribute, value] of attributes.matchAll(attributePattern)) {
        if (attribute === "id") classes.push(`logo-${value}`);
        else if (attribute === "class") classes.unshift(value);
        else if (attribute === "style") classes.push(rules.add(customProperties(value)));
        else kept.push(`${attribute}="${themed(value)}"`);
      }
      if (classes.length > 0) kept.unshift(`class="${classes.join(" ")}"`);
      return `<${name}${kept.map((attribute) => ` ${attribute}`).join("")}${selfClosing ? "/" : ""}>`;
    },
  );
}

/** The custom properties of a style attribute; any other declaration throws. */
function customProperties(style: string): [string, string][] {
  return style
    .split(";")
    .filter((declaration) => declaration.trim() !== "")
    .map((declaration) => {
      const [property, value] = declaration.split(":").map((part) => part.trim());
      if (!property.startsWith("--") || value === undefined || value === "") {
        throw new Error(`The logo's style "${style}" sets more than custom properties`);
      }
      return [property, value];
    });
}

/** An attribute value with each logo colour replaced by its token. */
function themed(value: string): string {
  return value.replace(/#[0-9a-f]{6}\b/gi, (colour) => {
    const token = logoTokens[colour.toLowerCase()];
    if (token === undefined) throw new Error(`The logo uses ${colour}, which has no logo token`);
    return `var(${token})`;
  });
}

const seconds = (value: number) => `${value}s`;

function tracePaths(list: readonly Trace[], rules: TimingRules): string {
  return list
    .map(({ d, delay, duration }) => {
      const timing = rules.add([
        ["--d", seconds(delay)],
        ["--dur", seconds(duration)],
      ]);
      return `<path class="trace ${timing}" pathLength="1" d="${d}"/>`;
    })
    .join("");
}

function nodeCircles(rules: TimingRules): string {
  return traceNodes
    .map(([x, y], index) => {
      const timing = rules.add([["--d", seconds(traceNodeDelay(index))]]);
      return `<circle class="trace-node ${timing}" cx="${x}" cy="${y}" r="9"/>`;
    })
    .join("");
}

/**
 * The hero scene, from the themeable animated logo: the left traces and their
 * nodes, their mirror image, the right-only trace, the idle dot, then the logo
 * on top.
 */
export function heroScene(animatedLogo: string): HeroScene {
  const rules = new TimingRules();
  const side = (mirror: boolean) =>
    `<g class="trace-side"${mirror ? ' transform="translate(1024 0) scale(-1 1)"' : ""}>` +
    `<g class="traces">${tracePaths(traces, rules)}</g>` +
    `<g class="trace-nodes">${nodeCircles(rules)}</g></g>`;
  const left = side(false);
  const right = side(true);
  const rightOnly = `<g class="traces">${tracePaths(rightOnlyTraces, rules)}</g>`;
  const dot = '<circle class="scene-dot" r="8"/>';
  const logo = sceneLogo(animatedLogo, rules);
  const svg =
    `<svg class="hero-scene-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${sceneViewBox}" ` +
    `aria-hidden="true" focusable="false">${left}${right}${rightOnly}${dot}${logo}</svg>`;
  const dotRule = `.hero-scene .scene-dot{offset-path:path("${dotTrace}")}`;
  return { svg, css: `${rules.css}\n${dotRule}` };
}
