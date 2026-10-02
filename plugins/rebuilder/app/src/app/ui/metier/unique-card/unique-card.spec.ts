import { TestBed } from '@angular/core/testing';
import type { Card } from '../../../core/models';
import { AcCardTile } from '../card-tile/card-tile';
import { AcUniqueCard } from './unique-card';

/** Shape of `/api/cards` without `locale` (text fields are locale maps). */
const unique: Card = {
  reference: 'ALT_CORE_B_OR_17_U_4785',
  collectorNumberFormatedId: 'BTG-137-U-4785',
  transfuge: true,
  name: { fr: 'Jeanne d’Arc', en: 'Joan of Arc' },
  faction: { code: 'AX', name: 'Axiom' },
  rarity: { reference: 'UNIQUE' },
  cardType: { reference: 'CHARACTER', name: { fr: 'Personnage', en: 'Character' } },
  cardSubTypes: [{ reference: 'SOLDIER', name: { fr: 'Soldat' } }],
  mainCost: 4,
  recallCost: 3,
  forestPower: 3,
  mountainPower: 2,
  oceanPower: 0,
  mainEffect: { fr: '{H} [Sabotez].  {J} Piochez une carte.' },
  echoEffect: [],
};

describe('AcUniqueCard', () => {
  function render(card: Card): HTMLElement {
    const fixture = TestBed.createComponent(AcUniqueCard);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('eager', true);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('prints the unique’s own stats, text and collector number', () => {
    const el = render(unique);
    expect(el.querySelector('.name')?.textContent).toBe('Jeanne d’Arc');
    expect(el.querySelector('.type')?.textContent).toBe('Personnage - Soldat');
    expect(el.querySelector('.main')?.textContent?.trim()).toBe('4');
    expect(el.querySelector('.recall')?.textContent?.trim()).toBe('3');
    expect([...el.querySelectorAll('.powers li')].map((li) => li.getAttribute('aria-label'))).toEqual(['Forêt 3', 'Montagne 2', 'Océan 0']);
    const lines = [...el.querySelectorAll('.text p')].map((p) => p.textContent);
    expect(lines[0]).toMatch(/Sabotez\.$/);
    expect(lines[1]).toMatch(/Piochez une carte\.$/);
    expect(el.querySelector('.text .b')?.textContent).toBe('Sabotez');
    expect(el.querySelector('.foot')?.textContent).toContain('BTG-137-U-4785');
    expect(el.querySelector('.frame')?.getAttribute('src')).toContain('AX_T3.webp');
  });

  it('draws on the unique illustration, not the common print', () => {
    const img = render(unique).querySelector('ac-card-art img');
    expect(img?.getAttribute('src')).toBe('https://cdn.alteredcore.org/illustrations/CORE/ALT_CORE_B_OR_17_U_FRAMELESS_T3.webp');
  });

  it('keeps the illustration alone when a deck line has no stats', () => {
    const el = render({ reference: 'ALT_CORE_B_OR_17_U_4785', name: 'Jeanne d’Arc' });
    expect(el.querySelector('.cost')).toBeNull();
    expect(el.querySelector('.text')).toBeNull();
    expect(el.querySelector('.name')?.textContent).toBe('Jeanne d’Arc');
  });
});

describe('AcCardTile with a unique', () => {
  it('renders the unique face and keeps the add button', () => {
    const fixture = TestBed.createComponent(AcCardTile);
    fixture.componentRef.setInput('card', unique);
    fixture.componentRef.setInput('max', 1);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ac-unique-card')).not.toBeNull();
    expect(el.querySelector('button[aria-label="Ajouter Jeanne d’Arc au deck"]')).not.toBeNull();
  });
});
