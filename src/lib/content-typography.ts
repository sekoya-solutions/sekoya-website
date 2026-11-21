/**
 * The text of Markdown and MDX bodies gets the same treatment as the JSON
 * collections and the frontmatter (ADR 0004, ADR 0007): French typography in
 * a French entry, and each `[TODO: …]` placeholder shown as a chip
 * (`.placeholder`, src/styles/global.css). An entry's language is its folder:
 * `src/content/<collection>/<locale>/<entry>.mdx`. Code is left as written.
 *
 * A hast plugin for Astro's Markdown processor, Sätteri (astro.config.mjs).
 */
import { fileURLToPath } from "node:url";
import { defineHastPlugin, type HastNode, type HastVisitorContext } from "satteri";
import { frenchTypography } from "./french-typography";
import { splitPlaceholders } from "./placeholders";

/** The elements whose text is shown as written. */
const verbatim = new Set(["code", "pre", "kbd", "samp", "script", "style"]);

/** Whether a file is a French entry: one in a `fr` folder. */
export function isFrenchEntry(fileURL: URL | undefined): boolean {
  if (fileURL === undefined) return false;
  return fileURLToPath(fileURL).split(/[\\/]/).at(-2) === "fr";
}

/** Whether a node sits inside an element whose text is kept as written. */
function isVerbatim(node: Readonly<HastNode>, ctx: HastVisitorContext): boolean {
  for (let parent = ctx.parent(node); parent !== undefined; parent = ctx.parent(parent)) {
    if (parent.type === "element" && verbatim.has(parent.tagName)) return true;
  }
  return false;
}

/** The nodes a text becomes: plain text, and a chip for each placeholder. */
export function textNodes(text: string): HastNode[] {
  return splitPlaceholders(text).map((part) =>
    part.placeholder
      ? {
          type: "element",
          tagName: "span",
          properties: { className: ["placeholder"] },
          children: [{ type: "text", value: part.text }],
        }
      : { type: "text", value: part.text },
  );
}

export const contentTypography = defineHastPlugin({
  name: "sekoya-content-typography",
  text(node, ctx) {
    if (isVerbatim(node, ctx)) return;
    const text = isFrenchEntry(ctx.fileURL) ? frenchTypography(node.value) : node.value;
    const nodes = textNodes(text);
    const unchanged = nodes.length === 1 && nodes[0]?.type === "text" && text === node.value;
    if (!unchanged) ctx.replaceNode(node, nodes);
  },
});
