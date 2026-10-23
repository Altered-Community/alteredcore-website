import { TestBed } from '@angular/core/testing';
import { AcEffectSummary } from './effect-summary';

describe('AcEffectSummary', () => {
  it('offers edit, duplicate and delete, in that order, each named after the effect', () => {
    TestBed.configureTestingModule({ imports: [AcEffectSummary] });
    const fixture = TestBed.createComponent(AcEffectSummary);
    fixture.componentRef.setInput('effect', { id: 'e1', triggers: [], conditions: [], effects: [{ id: 3, text: 'Ravitaillez' }] });
    fixture.componentRef.setInput('title', 'Effet 2');
    fixture.detectChanges();
    let duplicated = 0;
    fixture.componentInstance.duplicate.subscribe(() => duplicated++);
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.head button')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Modifier Effet 2', 'Dupliquer Effet 2', 'Supprimer Effet 2']);
    buttons[1].click();
    expect(duplicated).toBe(1);
  });
});
