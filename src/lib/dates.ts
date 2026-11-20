/**
 * Dates are shown numerically in both languages (ADR 0004): day, month and
 * year, as `17/11/2026`.
 */

/** A calendar date written `YYYY-MM-DD`, shown as `DD/MM/YYYY`; any other text throws. */
export function numericDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) throw new Error(`"${isoDate}" is not a YYYY-MM-DD date`);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
