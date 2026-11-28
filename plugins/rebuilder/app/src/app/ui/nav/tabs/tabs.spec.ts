import { TestBed } from '@angular/core/testing';
import { AcTabs, type AcTab } from './tabs';

describe('AcTabs', () => {
  function setup(tabs: AcTab[], active = 'all') {
    const fixture = TestBed.createComponent(AcTabs);
    fixture.componentRef.setInput('tabs', tabs);
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('button[role=tab]')];
    return { fixture, el, buttons };
  }

  it('marks disabled tabs with disabled & aria-disabled and ignores clicks on them', () => {
    const { fixture, buttons } = setup([
      { id: 'all', label: 'Toutes les cartes' },
      { id: 'collection', label: 'Collection physique', disabled: true },
      { id: 'owned', label: 'Propriété numérique', disabled: true },
    ]);
    const btns = buttons();
    expect(btns.map((b) => b.disabled)).toEqual([false, true, true]);
    expect(btns.map((b) => b.getAttribute('aria-disabled'))).toEqual([null, 'true', 'true']);

    btns[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('all');
  });

  it('skips disabled tabs during ArrowRight / ArrowLeft keyboard navigation', () => {
    const { fixture, buttons } = setup([
      { id: 'all', label: 'Toutes les cartes' },
      { id: 'collection', label: 'Collection physique', disabled: true },
      { id: 'favorites', label: 'Favoris' },
    ]);
    buttons()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('favorites');

    buttons()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('all');
  });
});
