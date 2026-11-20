/**
 * Placeholders (ADR 0007): a fact not yet provided or approved is written
 * `[TODO: …]` in the content, and the page shows it as a placeholder chip,
 * never as an estimate.
 */

/** A piece of text: plain, or a placeholder. */
export interface TextPart {
  readonly text: string;
  readonly placeholder: boolean;
}

const placeholderPattern = /(\[TODO:[^\]]*\])/;

/** Splits a text into its plain parts and its `[TODO: …]` placeholders, in order. */
export function splitPlaceholders(text: string): TextPart[] {
  return text
    .split(placeholderPattern)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, placeholder: placeholderPattern.test(part) }));
}
