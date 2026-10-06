import { isUniqueReference } from '../../../core/card-art';
import { GROUP_LABELS, groupIdOf, type DeckGroupId } from '../../../core/deck-view';
import { typeOf } from '../../../core/deck-rules';
import { contentLocale } from '../../../core/locale';
import { localizedText, type HydratedLine } from '../../../core/models';

export type BoardGroupId = DeckGroupId | 'uniques';

/** A column group of the deck board: one card type, `columns` card columns wide. */
export interface BoardGroup {
  id: BoardGroupId;
  label: string;
  count: number;
  lines: HydratedLine[];
  columns: number;
}

const ORDER: BoardGroupId[] = ['characters', 'spells', 'permanents', 'uniques', 'other'];
const UNIQUES = $localize`:@@deck.board.uniques:Uniques`;

/**
 * The deck board: one group per type (Uniques apart from the other Characters), cards by main cost then name. Every
 * group has the same number of rows, the smallest that fits the board in `maxColumns` card columns. Lines at 0 copies
 * stay (a card just removed in the editor).
 */
export function deckBoard(lines: readonly HydratedLine[], maxColumns = 12): BoardGroup[] {
  const buckets = new Map<BoardGroupId, HydratedLine[]>();
  for (const line of lines) {
    if (typeOf(line.card) === 'HERO' || line.quantity < 0) continue;
    const id: BoardGroupId = isUniqueReference(line.card.reference) ? 'uniques' : groupIdOf(line.card);
    buckets.set(id, [...(buckets.get(id) ?? []), line]);
  }
  const locale = contentLocale();
  const groups = ORDER.filter((id) => buckets.has(id)).map((id) => {
    const rows = [...(buckets.get(id) ?? [])].sort(
      (a, b) =>
        (a.card.mainCost ?? 99) - (b.card.mainCost ?? 99) ||
        localizedText(a.card.name, locale).localeCompare(localizedText(b.card.name, locale), locale),
    );
    return { id, label: id === 'uniques' ? UNIQUES : GROUP_LABELS[id].label, count: rows.reduce((n, l) => n + l.quantity, 0), lines: rows, columns: 1 };
  });
  const rows = boardRows(groups.map((g) => g.lines.length), maxColumns);
  return groups.map((g) => ({ ...g, columns: Math.max(1, Math.ceil(g.lines.length / rows)) }));
}

/** The smallest row count with which groups of these sizes fit in `maxColumns` columns (each group at least one). */
export function boardRows(sizes: readonly number[], maxColumns: number): number {
  const most = Math.max(1, ...sizes);
  let rows = 1;
  while (rows < most && sizes.reduce((n, size) => n + Math.max(1, Math.ceil(size / rows)), 0) > maxColumns) rows++;
  return rows;
}
