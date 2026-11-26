import { TestBed } from '@angular/core/testing';
import { defaultFilters } from '../../core/card-filters';
import { CardSearchMemory } from './card-search-memory';

describe('CardSearchMemory', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('remembers the last tab and the filters of each tab, per deck', () => {
    const memory = TestBed.inject(CardSearchMemory);
    expect(memory.source('d1')).toBeNull();
    expect(memory.filters('d1', 'uniques', 'standard')).toBeUndefined();

    const uniques = { ...defaultFilters('uniques', 'standard'), q: 'Sierra', mainCost: '3' };
    const favorites = { ...defaultFilters('favorites', 'standard'), q: 'Kojo' };
    memory.save('d1', 'uniques', uniques, 'standard');
    memory.save('d1', 'favorites', favorites, 'standard');

    expect(memory.source('d1')).toBe('favorites');
    expect(memory.filters('d1', 'uniques', 'standard')).toEqual(uniques);
    expect(memory.filters('d1', 'favorites', 'standard')).toEqual(favorites);
    expect(memory.source('d2')).toBeNull();
  });

  it('survives a new instance (a reload) through sessionStorage', () => {
    const uniques = { ...defaultFilters('uniques', 'standard'), q: 'Sierra' };
    TestBed.inject(CardSearchMemory).save('d1', 'uniques', uniques, 'standard');
    TestBed.resetTestingModule();
    expect(TestBed.inject(CardSearchMemory).filters('d1', 'uniques', 'standard')).toEqual(uniques);
  });

  it('follows a format change on the Uniques tab (Frontier), other filters kept', () => {
    const memory = TestBed.inject(CardSearchMemory);
    memory.save('d1', 'uniques', { ...defaultFilters('uniques', 'standard'), q: 'Sierra' }, 'standard');
    expect(memory.filters('d1', 'uniques', 'frontier')).toMatchObject({ q: 'Sierra', environment: 'frontier' });
  });
});
