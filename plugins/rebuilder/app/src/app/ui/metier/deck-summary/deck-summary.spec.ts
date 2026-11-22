import { TestBed } from '@angular/core/testing';
import { AcDeckSummary } from './deck-summary';

const hero = { reference: 'ALT_CORE_B_AX_01_C', name: 'Sierra & Oddball', faction: 'AX' };

describe('AcDeckSummary', () => {
  function render(editable: boolean) {
    const fixture = TestBed.createComponent(AcDeckSummary);
    fixture.componentRef.setInput('hero', hero);
    fixture.componentRef.setInput('rarity', { C: 0, R: 0, U: 0, E: 0 });
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    return fixture;
  }

  it('opens « Choisir un héros » from the hero thumbnail when the deck is editable', () => {
    const fixture = render(true);
    let changes = 0;
    let settings = 0;
    fixture.componentInstance.changeHero.subscribe(() => changes++);
    fixture.componentInstance.openSettings.subscribe(() => settings++);
    const thumb = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.thumb');
    expect(thumb?.getAttribute('aria-label')).toBe('Changer de héros');
    expect(thumb?.querySelector('ac-card-art')).not.toBeNull();
    thumb!.click();
    expect(changes).toBe(1);
    expect(settings).toBe(0);
  });

  it('keeps a plain thumbnail on a read-only deck', () => {
    const el = render(false).nativeElement as HTMLElement;
    expect(el.querySelector('button.thumb')).toBeNull();
    expect(el.querySelector('.thumb ac-card-art')).not.toBeNull();
  });
});
