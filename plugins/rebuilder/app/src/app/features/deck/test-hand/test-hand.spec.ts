import { TestBed } from '@angular/core/testing';
import type { HydratedLine } from '../../../core/models';
import { TestHand } from './test-hand';

const lines: HydratedLine[] = [
  { quantity: 3, card: { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou !', cardType: { reference: 'SPELL' }, mainCost: 2 } },
  { quantity: 3, card: { reference: 'ALT_CORE_B_YZ_11_C', name: 'Baba', cardType: { reference: 'CHARACTER' }, mainCost: 3 } },
  { quantity: 1, card: { reference: 'ALT_CORE_B_YZ_12_C', name: 'Apprenti', cardType: { reference: 'CHARACTER' }, mainCost: 1 } },
];

describe('TestHand', () => {
  it('deals 6 cards, draws one more, then deals a new hand', () => {
    const fixture = TestBed.createComponent(TestHand);
    fixture.componentRef.setInput('lines', lines);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tiles = () => el.querySelectorAll('ar-card-tile').length;
    expect(tiles()).toBe(6);
    expect(el.textContent).toContain('1 carte dans le deck');

    const [, draw] = Array.from(el.querySelectorAll('button'));
    draw.click();
    fixture.detectChanges();
    expect(tiles()).toBe(7);
    expect(el.textContent).toContain('Deck vide');
    expect(draw.disabled).toBe(true);

    fixture.componentInstance.newHand();
    fixture.detectChanges();
    expect(tiles()).toBe(6);
  });
});
