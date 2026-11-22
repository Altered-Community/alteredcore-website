import { isUniqueReference } from '../../../core/card-art';
import { typeOf } from '../../../core/deck-rules';
import { GROUP_LABELS, compareLines, groupIdOf, type DeckGroupId } from '../../../core/deck-view';
import type { HydratedLine } from '../../../core/models';

export type BoardGroupId = DeckGroupId | 'uniques';

/** A column group of the deck board: one card type. */
export interface BoardGroup {
  id: BoardGroupId;
  label: string;
  count: number;
  lines: HydratedLine[];
}

/** A group laid out on the board, `columns` card columns wide. */
export interface BoardColumnGroup extends BoardGroup {
  columns: number;
}

const ORDER: BoardGroupId[] = ['characters', 'spells', 'permanents', 'uniques', 'other'];
const UNIQUES = $localize`:@@deck.board.uniques:Uniques`;

/**
 * The deck board's groups: one per type (Uniques apart from the other Characters), cards in decklist order. Lines at 0
 * copies stay (a card just removed in the editor).
 */
export function boardGroups(lines: readonly HydratedLine[]): BoardGroup[] {
  const buckets = new Map<BoardGroupId, HydratedLine[]>();
  for (const line of lines) {
    if (typeOf(line.card) === 'HERO' || line.quantity < 0) continue;
    const id: BoardGroupId = isUniqueReference(line.card.reference) ? 'uniques' : groupIdOf(line.card);
    let bucket = buckets.get(id);
    if (!bucket) buckets.set(id, (bucket = []));
    bucket.push(line);
  }
  return ORDER.flatMap((id) => {
    const rows = buckets.get(id);
    if (!rows) return [];
    rows.sort(compareLines);
    return [{ id, label: id === 'uniques' ? UNIQUES : GROUP_LABELS[id].label, count: rows.reduce((n, l) => n + l.quantity, 0), lines: rows }];
  });
}

/** Every group gets the same number of rows, the smallest that fits the board in `maxColumns` card columns. */
export function layoutBoard(groups: readonly BoardGroup[], maxColumns: number): BoardColumnGroup[] {
  const rows = boardRows(groups.map((g) => g.lines.length), maxColumns);
  return groups.map((g) => ({ ...g, columns: Math.max(1, Math.ceil(g.lines.length / rows)) }));
}

/** The deck board: its groups laid out in `maxColumns` card columns at most. */
export function deckBoard(lines: readonly HydratedLine[], maxColumns = 12): BoardColumnGroup[] {
  return layoutBoard(boardGroups(lines), maxColumns);
}

/** The smallest row count with which groups of these sizes fit in `maxColumns` columns (each group at least one). */
export function boardRows(sizes: readonly number[], maxColumns: number): number {
  const most = Math.max(1, ...sizes);
  let rows = 1;
  while (rows < most && sizes.reduce((n, size) => n + Math.max(1, Math.ceil(size / rows)), 0) > maxColumns) rows++;
  return rows;
}

/**
 * Card columns that fit `width` with cards of `minCard` px at least: each group has its padding on both sides less one
 * gap (the board's CSS), each column a card and a gap.
 */
export function fitColumns(width: number, groups: number, minCard: number, padding: number, gap: number): number {
  return Math.max(1, Math.floor((width - groups * (2 * padding - gap)) / (minCard + gap)));
}
