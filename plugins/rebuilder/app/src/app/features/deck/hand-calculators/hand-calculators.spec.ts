import { TestBed } from '@angular/core/testing';
import type { HydratedLine } from '../../../core/models';
import { HandCalculators } from './hand-calculators';

const lines: HydratedLine[] = [
  { quantity: 3, card: { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou', cardType: { reference: 'SPELL' }, mainCost: 2 } },
  { quantity: 3, card: { reference: 'ALT_CORE_B_YZ_11_C', name: 'Baba', cardType: { reference: 'CHARACTER' }, mainCost: 3 } },
  { quantity: 34, card: { reference: 'ALT_CORE_B_YZ_12_C', name: 'Filler', cardType: { reference: 'CHARACTER' }, mainCost: 1 } },
];

interface Harness {
  cards: { set(v: { id: number; text: string }[]): void };
  groupA: { set(v: { id: number; text: string }[]): void };
  groupB: { set(v: { id: number; text: string }[]): void };
  cardBars(): { p: number | null }[];
  comboBars(): { p: number | null }[];
  cardRatio(): string;
  drawnInput: { set(v: string): void };
  drawn(): number;
}

describe('HandCalculators', () => {
  it('gives the odds of the chosen cards and of a combo, for the number of cards drawn', () => {
    const fixture = TestBed.createComponent(HandCalculators);
    fixture.componentRef.setInput('lines', lines);
    fixture.detectChanges();
    const c = fixture.componentInstance as unknown as Harness;
    expect(c.cardBars().every((b) => b.p === null)).toBe(true);

    c.cards.set([{ id: 1, text: 'Baba' }]);
    // 3 copies among 40, 6 drawn: P(≥ 1) = 1 − C(37,6)/C(40,6) ≈ 0.3943.
    expect(c.cardBars()[1].p).toBeCloseTo(1 - 2324784 / 3838380, 6);
    expect(c.cardRatio()).toBe('≈ 2 sur 5 mains');

    c.groupA.set([{ id: 0, text: 'Zou' }]);
    c.groupB.set([{ id: 0, text: 'Zou' }]);
    expect(c.comboBars()[2].p).toBeNull(); // B minus A is empty: no combo
    c.groupB.set([{ id: 1, text: 'Baba' }]);
    expect(c.comboBars()[2].p).toBeGreaterThan(0);

    c.drawnInput.set('99');
    expect(c.drawn()).toBe(40);
    expect(c.cardBars()[1].p).toBe(1);
  });
});
