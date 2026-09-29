import { TestBed } from '@angular/core/testing';
import type { Card } from '../../../core/models';
import { ArDeckRow } from './deck-row';

const card: Card = { reference: 'ALT_CORE_B_LY_10_C', name: 'Chanteuse', cardType: { reference: 'CHARACTER' } };

describe('ArDeckRow', () => {
  function render(inputs: Record<string, unknown>): HTMLElement {
    const fixture = TestBed.createComponent(ArDeckRow);
    fixture.componentRef.setInput('card', card);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks a line that breaks a rule, with the reasons', () => {
    const el = render({ quantity: 2, issues: ['Hors de la faction du héros', 'Carte bannie'] });
    expect(el.classList).toContain('invalid');
    expect(el.querySelector('.issue')?.getAttribute('aria-label')).toBe('Hors de la faction du héros · Carte bannie');
  });

  it('shows no marker on a valid line', () => {
    const el = render({ quantity: 2 });
    expect(el.classList).not.toContain('invalid');
    expect(el.querySelector('.issue')).toBeNull();
  });

  it('replaces the stepper by the reason when the card cannot be added', () => {
    const el = render({ max: 0, blockedReason: 'Cartes uniques interdites en Standard No Unique' });
    expect(el.querySelector('ar-stepper')).toBeNull();
    expect(el.querySelector('.blocked')?.getAttribute('title')).toBe('Cartes uniques interdites en Standard No Unique');
  });
});
