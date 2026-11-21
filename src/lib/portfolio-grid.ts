/**
 * The portfolio's grid: 1 column on phones, 2 on tablets, 3 from 1024 px,
 * where a card may span 2 columns. After the last project, the ghost card
 * ("next project") fills the cells left empty on the last row, and is not
 * shown when that row is full.
 *
 * CSS grid places the cards in order, each on the first row where it fits
 * from the cursor on (sparse auto-placement): a card too wide for what is
 * left of a row starts the next row, leaving a gap. Cards span columns only,
 * so the placement is worked out here, at build time, the same way, and the
 * ghost card gets its span for each column count.
 */

/** The grid's column counts, from the narrowest screen up. */
export const gridColumns = [1, 2, 3] as const;

/** A column count of the grid. */
export type GridColumns = (typeof gridColumns)[number];

/**
 * The number of cells the ghost card fills on the last row, for cards of the
 * given spans in a grid of `columns` columns: 0 when the last row is full.
 * A span wider than the grid takes the whole row, as CSS clamps it.
 */
export function ghostSpan(spans: readonly number[], columns: number): number {
  if (!Number.isInteger(columns) || columns < 1) {
    throw new Error(`A grid needs a whole, positive number of columns, not ${columns}`);
  }
  let column = 0;
  for (const span of spans) {
    if (!Number.isInteger(span) || span < 1) {
      throw new Error(`A card spans a whole, positive number of columns, not ${span}`);
    }
    const width = Math.min(span, columns);
    if (column + width > columns) column = 0;
    column = (column + width) % columns;
  }
  return column === 0 ? 0 : columns - column;
}
