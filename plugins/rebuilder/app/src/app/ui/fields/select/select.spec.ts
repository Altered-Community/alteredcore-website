import { TestBed } from '@angular/core/testing';
import { AcSelect, type AcOption } from './select';

const HEROES: AcOption[] = [
  { value: '', label: 'All heroes' },
  { value: 'della', label: 'Della & Bolt', group: 'Axiom', color: 'var(--ac-faction-axiom)' },
  { value: 'sierra', label: 'Sierra & Oddball', group: 'Axiom', color: 'var(--ac-faction-axiom)' },
  { value: 'kojo', label: 'Kojo & Booda', group: 'Bravos', color: 'var(--ac-faction-bravos)', disabled: true },
  { value: 'teija', label: 'Teija & Nauraa', group: 'Muna', color: 'var(--ac-faction-muna)' },
  { value: 'akesha', label: 'Akesha & Taru', group: 'Yzmir', color: 'var(--ac-faction-yzmir)' },
  { value: 'moyo', label: 'Moyo & Silk', group: 'Yzmir', color: 'var(--ac-faction-yzmir)' },
  { value: 'sigismar', label: 'Sigismar & Wingspan', group: 'Ordis', color: 'var(--ac-faction-ordis)' },
];

/** The list is a CDK overlay: it renders in the overlay container, not inside the component. */
const panel = () => document.querySelector<HTMLElement>('.cdk-overlay-container .ac-listbox__panel');
const options = () => [...(panel()?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];
const texts = () => options().map((o) => o.querySelector('.ac-listbox__label')?.textContent);

function setup(opts: AcOption[], value = '', inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AcSelect);
  fixture.componentRef.setInput('options', opts);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('ariaLabel', 'Hero');
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  document.body.appendChild(el);
  const trigger = el.querySelector<HTMLButtonElement>('.ac-listbox__trigger')!;
  const key = (target: HTMLElement, k: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const done = () => {
    fixture.destroy();
    el.remove();
  };
  return { fixture, el, trigger, key, done };
}

describe('AcSelect (ac-listbox)', () => {
  it('shows the selected option, with its dot, on a combobox button', () => {
    const { trigger, done } = setup(HEROES, 'teija');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent?.trim()).toBe('Teija & Nauraa');
    expect(trigger.getAttribute('aria-label')).toBe('Hero, Teija & Nauraa');
    expect(trigger.querySelector<HTMLElement>('.ac-listbox__dot')?.style.getPropertyValue('--ac-listbox-dot')).toBe('var(--ac-faction-muna)');
    done();
  });

  it('lists options under group headers with a count, the dot on the header only', () => {
    const { trigger, fixture, done } = setup(HEROES);
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const headers = [...panel()!.querySelectorAll('.ac-listbox__group-label')].map((h) => [...h.querySelectorAll('span:not(.ac-listbox__dot)')].map((s) => s.textContent).join(' '));
    expect(headers).toEqual(['Axiom 2', 'Bravos 1', 'Muna 1', 'Yzmir 2', 'Ordis 1']);
    expect(panel()!.querySelectorAll('.ac-listbox__group-label .ac-listbox__dot')).toHaveLength(5);
    expect(panel()!.querySelectorAll('[role=option] .ac-listbox__dot')).toHaveLength(0);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    done();
  });

  it('shows a search field from 8 options that filters names and group names', () => {
    const { trigger, fixture, done } = setup(HEROES);
    trigger.click();
    fixture.detectChanges();
    const search = panel()!.querySelector<HTMLInputElement>('.ac-listbox__search input')!;
    expect(search).toBeTruthy();
    search.value = 'yz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(texts()).toEqual(['Akesha & Taru', 'Moyo & Silk']);
    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(options()).toHaveLength(0);
    expect(panel()!.querySelector('.ac-listbox__empty')?.textContent).toContain('zzz');
    done();
  });

  it('has no search field under 8 options', () => {
    const { trigger, fixture, done } = setup(HEROES.slice(0, 4));
    trigger.click();
    fixture.detectChanges();
    expect(panel()!.querySelector('.ac-listbox__search')).toBeNull();
    done();
  });

  it('picks with the keyboard, skipping disabled options, and gives the focus back', () => {
    const { trigger, fixture, key, done } = setup(HEROES, 'sierra');
    const changes: string[] = [];
    fixture.componentInstance.value.subscribe((v) => changes.push(v));
    trigger.focus();
    key(trigger, 'ArrowDown');
    expect(panel()).toBeTruthy();
    expect(trigger.getAttribute('aria-activedescendant')).toBe(options()[2].id);
    key(trigger, 'ArrowDown');
    // Kojo (disabled) is skipped.
    expect(panel()!.querySelector('.is-active .ac-listbox__label')?.textContent).toBe('Teija & Nauraa');
    key(trigger, 'Enter');
    expect(fixture.componentInstance.value()).toBe('teija');
    expect(changes).toEqual(['teija']);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    done();
  });

  it('does not cancel the letters typed in the search field', () => {
    const { trigger, fixture, done } = setup(HEROES);
    trigger.click();
    fixture.detectChanges();
    const search = panel()!.querySelector<HTMLInputElement>('.ac-listbox__search input')!;
    const e = new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true });
    search.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    done();
  });

  it('closes on Escape without changing the value', () => {
    const { trigger, fixture, key, done } = setup(HEROES, 'della');
    trigger.click();
    fixture.detectChanges();
    key(trigger, 'ArrowDown');
    key(trigger, 'Escape');
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.value()).toBe('della');
    done();
  });
});
