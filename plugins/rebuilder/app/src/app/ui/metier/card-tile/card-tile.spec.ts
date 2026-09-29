import { TestBed } from '@angular/core/testing';
import type { Card } from '../../../core/models';
import { ArCardTile } from './card-tile';

const card = { reference: 'ALT_CORE_B_YZ_17_R1', name: 'Le Kraken', faction: { code: 'YZ' } } as unknown as Card;

describe('ArCardTile', () => {
  function render(inputs: Record<string, unknown>): HTMLElement {
    const fixture = TestBed.createComponent(ArCardTile);
    fixture.componentRef.setInput('card', card);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows « + » when editing a deck', () => {
    expect(render({}).querySelector('button[aria-label="Ajouter Le Kraken au deck"]')).not.toBeNull();
  });

  it('says why a card cannot be added instead of a disabled « + »', () => {
    const el = render({ max: 0, blockedReason: 'Cartes uniques interdites en Standard No Unique' });
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('.blocked')?.getAttribute('title')).toBe('Cartes uniques interdites en Standard No Unique');
    expect(el.querySelector('.blocked .ar-sr-only')?.textContent).toBe('Cartes uniques interdites en Standard No Unique');
  });

  it('shows only the card in the card browser (plain)', () => {
    const el = render({ plain: true, quantity: 2 });
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('.qty')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Le Kraken');
  });
});
