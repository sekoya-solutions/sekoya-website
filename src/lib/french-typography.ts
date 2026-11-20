/**
 * French typography (ADR 0004): the space before « : ; ? ! » » and after
 * « « » becomes a no-break space (U+00A0), so a line never starts with one of
 * these marks or ends on an opening guillemet. Only an existing space is
 * replaced, never added: a missing one stays as written, and times (12:30)
 * or addresses (https://) are left alone. Any run of horizontal whitespace
 * there, including a narrow no-break space (U+202F), which the Outfit font
 * does not have, becomes one U+00A0. Line breaks are kept.
 */

const nbsp = " ";

/** One or more horizontal whitespace characters: every whitespace but line breaks. */
const spaces = String.raw`[^\S\r\n  ]+`;
const beforeMark = new RegExp(`${spaces}(?=[:;?!»])`, "g");
const afterGuillemet = new RegExp(`(?<=«)${spaces}`, "g");

/** Applies French typography to a plain text string. Applying it twice changes nothing. */
export function frenchTypography(text: string): string {
  return text.replace(beforeMark, nbsp).replace(afterGuillemet, nbsp);
}

/** A tree of strings, such as an interface dictionary. */
export type StringTree = { readonly [key: string]: string | StringTree };

/** Applies French typography to every string of a tree, keeping its shape. */
export function frenchTypographyTree<T extends StringTree>(tree: T): T {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === "string" ? frenchTypography(value) : frenchTypographyTree(value),
    ]),
  ) as T;
}
