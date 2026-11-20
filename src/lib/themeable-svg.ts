/**
 * The brand logos exist in a dark and a light version that differ only by
 * their colours: each dark-theme logo colour has one light-theme counterpart.
 * Replacing those colours with the logo tokens of tokens.css gives one inline
 * SVG that follows the theme.
 */
export const logoTokens: Readonly<Record<string, string>> = {
  "#22c08a": "--logo-canopy",
  "#e8d3a8": "--logo-gold",
  "#9dbdcc": "--logo-roots",
};

/**
 * Turns a dark-theme logo into an inline SVG that follows the theme:
 * - each logo colour becomes its token (`tokens`: the dark-theme colours by
 *   default, the light ones to check a light logo against them); a colour
 *   with no token throws, so a changed logo cannot keep a fixed colour;
 * - the `id` attributes are removed, so several logos can share a page, and
 *   the `aria-labelledby` pointing at the `<title>` becomes an `aria-label`
 *   with the same text. Any other reference to an id throws.
 */
export function themeableSvg(
  svg: string,
  tokens: Readonly<Record<string, string>> = logoTokens,
): string {
  const title = /<title[^>]*>([^<]+)<\/title>/.exec(svg)?.[1];
  if (title === undefined) throw new Error("The logo has no <title>");
  if (/url\(#|href="#/.test(svg)) throw new Error("The logo references an id");
  return svg
    .replace(/#[0-9a-f]{6}\b/gi, (colour) => {
      const token = tokens[colour.toLowerCase()];
      if (token === undefined) throw new Error(`The logo uses ${colour}, which has no logo token`);
      return `var(${token})`;
    })
    .replace(/\saria-labelledby="[^"]*"/, ` aria-label="${title}"`)
    .replace(/\sid="[^"]*"/g, "");
}
