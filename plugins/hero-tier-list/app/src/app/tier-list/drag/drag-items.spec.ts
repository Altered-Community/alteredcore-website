import type { Hero } from '../../core/heroes';
import { dragItems } from './drag-items';

const hero = (id: string): Hero => ({ id, name: id, faction: 'AX', reference: id, set: 'CORE' });
const keys = (items: { key: string }[]) => items.map((i) => i.key);

describe('dragItems', () => {
  const heroes = ['a', 'b', 'c'].map(hero);

  it('leaves the list alone when the drag is elsewhere', () => {
    expect(keys(dragItems(heroes, 't0', null, null))).toEqual(['a', 'b', 'c']);
    expect(keys(dragItems(heroes, 't0', { heroId: 'x' }, { list: 't1', index: 0 }))).toEqual(['a', 'b', 'c']);
  });

  it('puts the slot at the final place, the dragged hero not counted', () => {
    expect(keys(dragItems(heroes, 't0', { heroId: 'x' }, { list: 't0', index: 3 }))).toEqual(['a', 'b', 'c', '__drop-slot']);
    expect(keys(dragItems(heroes, 't0', { heroId: 'a' }, { list: 't0', index: 1 }))).toEqual(['a', 'b', '__drop-slot', 'c']);
    expect(keys(dragItems(heroes, 't0', { heroId: 'c' }, { list: 't0', index: 0 }))).toEqual(['__drop-slot', 'a', 'b', 'c']);
    expect(dragItems(heroes, 't0', { heroId: 'b' }, { list: 't0', index: 0 })[2].source).toBe(true);
  });
});
