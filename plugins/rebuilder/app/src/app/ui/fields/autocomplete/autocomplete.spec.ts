import { TestBed } from '@angular/core/testing';
import { AcAutocomplete, type AcSuggestion } from './autocomplete';

const KELON: AcSuggestion = { value: 'ALT_CORE_B_AX_04_C', label: 'Élémentaire de Kélon', meta: 'Commune', thumb: 'kelon.webp' };
const KELON_R: AcSuggestion = { value: 'ALT_CORE_B_AX_04_R1', label: 'Élémentaire de Kélon', meta: 'Rare' };

describe('AcAutocomplete', () => {
  /** The list is a CDK overlay: it renders in the overlay container, not inside the component. */
  const panel = () => document.querySelector<HTMLElement>('.cdk-overlay-container .ac-listbox__panel--suggestions');
  const options = () => [...(panel()?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];

  function setup() {
    const fixture = TestBed.createComponent(AcAutocomplete);
    fixture.componentRef.setInput('ariaLabel', 'Carte');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const input = el.querySelector<HTMLInputElement>('input')!;
    const queries: string[] = [];
    fixture.componentInstance.queryChange.subscribe((q) => queries.push(q));
    const type = (text: string) => {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const key = (k: string) => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    const done = () => {
      fixture.destroy();
      el.remove();
    };
    return { fixture, el, input, queries, type, key, done };
  }

  it('emits the text typed and lists the suggestions from two characters', () => {
    const { fixture, input, queries, type, done } = setup();
    type('k');
    expect(panel()).toBeNull();
    type('kél');
    expect(queries).toEqual(['k', 'kél']);
    fixture.componentRef.setInput('options', [KELON, KELON_R]);
    fixture.detectChanges();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(options()).toHaveLength(2);
    expect(options()[0].querySelector('mark')?.textContent).toBe('Kél');
    expect(options()[0].querySelector('.ac-listbox__meta')?.textContent).toBe('Commune');
    expect(options()[0].querySelector('img.ac-listbox__thumb')).not.toBeNull();
    done();
  });

  it('says it is searching, then that nothing matches', () => {
    const { fixture, type, done } = setup();
    type('zzz');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(panel()?.querySelector('.ac-listbox__empty')?.textContent?.trim()).toBe('Recherche…');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(panel()?.querySelector('.ac-listbox__empty')?.textContent?.trim()).toBe('Aucun résultat');
    done();
  });

  it('moves with the arrows, picks with Enter and shows the pick in the field', () => {
    const { fixture, input, type, key, done } = setup();
    type('kelon');
    fixture.componentRef.setInput('options', [KELON, KELON_R]);
    fixture.detectChanges();
    key('ArrowDown');
    key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[1].id);
    key('Enter');
    expect(fixture.componentInstance.selected()).toEqual(KELON_R);
    expect(panel()).toBeNull();
    expect(input.value).toBe(KELON_R.label);
    done();
  });

  it('clears the pick with the clear button, or when the user types again', () => {
    const { fixture, el, input, queries, type, done } = setup();
    fixture.componentRef.setInput('selected', KELON);
    fixture.detectChanges();
    expect(input.value).toBe(KELON.label);
    el.querySelector<HTMLButtonElement>('.clear')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBeNull();
    expect(input.value).toBe('');
    expect(queries.at(-1)).toBe('');

    fixture.componentRef.setInput('selected', KELON);
    fixture.detectChanges();
    type('Élémentaire de Kélo');
    expect(fixture.componentInstance.selected()).toBeNull();
    done();
  });

  it('picks the first suggestion on Enter when none is active, and Escape closes the list', () => {
    const { fixture, type, key, done } = setup();
    type('kelon');
    fixture.componentRef.setInput('options', [KELON, KELON_R]);
    fixture.detectChanges();
    key('Escape');
    expect(panel()).toBeNull();
    type('kelon ');
    fixture.componentRef.setInput('options', [KELON, KELON_R]);
    fixture.detectChanges();
    key('Enter');
    expect(fixture.componentInstance.selected()).toEqual(KELON);
    done();
  });
});
