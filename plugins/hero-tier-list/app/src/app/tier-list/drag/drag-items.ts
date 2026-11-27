import type { Hero } from '../../core/heroes';
import type { DropTarget } from './hero-drag';

/** A list's content while dragging: its heroes (the dragged one flagged) and, maybe, the landing slot. */
export interface DragItem {
  key: string;
  hero: Hero | null;
  /** The hero being dragged, hidden (tiers) or faded (pool) where it was. */
  source: boolean;
}

export function dragItems(heroes: Hero[], list: string, dragging: { heroId: string } | null, target: DropTarget | null): DragItem[] {
  const items: DragItem[] = heroes.map((hero) => ({ key: hero.id, hero, source: hero.id === dragging?.heroId }));
  if (!dragging || target?.list !== list) return items;
  // The slot goes before the target.index-th hero that is not the dragged one.
  let seen = 0;
  let at = items.length;
  for (let i = 0; i < items.length; i++) {
    if (items[i].source) continue;
    if (seen === target.index) {
      at = i;
      break;
    }
    seen++;
  }
  items.splice(at, 0, { key: '__drop-slot', hero: null, source: false });
  return items;
}
