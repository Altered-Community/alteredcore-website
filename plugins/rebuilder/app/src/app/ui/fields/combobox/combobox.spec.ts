import { TestBed } from '@angular/core/testing';
import { ArCombobox, type ComboOption } from './combobox';

const MAIN: ComboOption = { id: 1, text: 'Joué depuis la Main' };
const EXPEDITION: ComboOption = { id: 2, text: 'Quitte la zone d’Expédition' };

/** Direct children that make up the value list and the add field (the open list is ignored). */
function sequence(host: HTMLElement): string[] {
  return [...host.children]
    .filter((el) => el.classList.contains('picked') || el.classList.contains('or') || el.classList.contains('field'))
    .map((el) => {
      if (el.classList.contains('or')) return 'ou';
      if (el.classList.contains('field')) return 'field';
      return `chip:${el.querySelector('span')?.textContent}`;
    });
}

describe('ArCombobox « ou »', () => {
  function render(values: ComboOption[]): HTMLElement {
    const fixture = TestBed.createComponent(ArCombobox);
    fixture.componentRef.setInput('options', [MAIN, EXPEDITION]);
    fixture.componentRef.setInput('values', values);
    fixture.componentRef.setInput('placeholder', 'Ajouter un déclencheur…');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows no « ou » when no chip is selected', () => {
    const el = render([]);
    expect(sequence(el)).toEqual(['field']);
    expect(el.querySelectorAll('.or')).toHaveLength(0);
    expect(el.querySelector('.field [role=combobox]')?.textContent?.trim()).toBe('Ajouter un déclencheur…');
  });

  it('shows « ou » between the only chip and the add field', () => {
    const el = render([MAIN]);
    expect(sequence(el)).toEqual([`chip:${MAIN.text}`, 'ou', 'field']);
  });

  it('shows « ou » between chips and between the last chip and the add field', () => {
    const el = render([MAIN, EXPEDITION]);
    expect(sequence(el)).toEqual([`chip:${MAIN.text}`, 'ou', `chip:${EXPEDITION.text}`, 'ou', 'field']);
  });
});

describe('ArCombobox picker', () => {
  const HAND: ComboOption = { id: 22, text: 'Joué depuis la Main', glyph: '\ue023' };
  const NONE: ComboOption = { id: 191, text: 'Sans condition' };

  function setup(options: ComboOption[], values: ComboOption[] = []) {
    const fixture = TestBed.createComponent(ArCombobox);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('values', values);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const toggle = el.querySelector<HTMLButtonElement>('.field [role=combobox]')!;
    const open = () => {
      toggle.click();
      fixture.detectChanges();
    };
    return { fixture, el, toggle, open };
  }

  it('opens a list on a button, without a text field and without moving focus to one', () => {
    const { el, toggle, open } = setup([MAIN, EXPEDITION]);
    expect(el.querySelector('.field input')).toBeNull();
    expect(toggle.tagName).toBe('BUTTON');
    toggle.focus();
    open();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = el.querySelector('.panel')!;
    // The first control of the list is the search field, but it stays unfocused: no touch keyboard.
    const search = panel.querySelector('input')!;
    expect(search.hasAttribute('autofocus')).toBe(false);
    expect(document.activeElement).not.toBe(search);
    expect(document.activeElement).toBe(toggle);
    expect([...panel.querySelectorAll('[role=option]')].map((o) => o.textContent)).toEqual([MAIN.text, EXPEDITION.text]);
    el.remove();
  });

  it('picks a value without typing, and still filters when the user types', () => {
    const { fixture, el, open } = setup([MAIN, EXPEDITION]);
    open();
    el.querySelector<HTMLButtonElement>('[role=option]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.values()).toEqual([MAIN]);
    expect(el.querySelector('.panel')).toBeNull();

    open();
    const search = el.querySelector<HTMLInputElement>('.panel input')!;
    search.value = 'expé';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect([...el.querySelectorAll('[role=option]')].map((o) => o.textContent)).toEqual([EXPEDITION.text]);
    el.remove();
  });

  it('in a shadow root (the plugin), a press on an option keeps the list open until the click picks it', () => {
    const { fixture, el, open } = setup([MAIN, EXPEDITION]);
    const shadowHost = document.createElement('div');
    document.body.appendChild(shadowHost);
    shadowHost.attachShadow({ mode: 'open' }).appendChild(el);
    open();
    const option = el.querySelector<HTMLButtonElement>('[role=option]')!;
    // Seen from `document`, the target of this event is `shadowHost`, not the option.
    option.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    fixture.detectChanges();
    expect(el.querySelector('.panel')).not.toBeNull();
    option.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.values()).toEqual([MAIN]);

    open();
    shadowHost.shadowRoot!.appendChild(document.createElement('p')).dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    fixture.detectChanges();
    expect(el.querySelector('.panel')).toBeNull();
    shadowHost.remove();
  });

  it('shows the glyph in the option and on the chip', () => {
    const { fixture, el, open } = setup([HAND]);
    open();
    expect(el.querySelector('[role=option] .glyph')?.textContent).toBe('\ue023');
    el.querySelector<HTMLButtonElement>('[role=option]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.picked .glyph')?.textContent).toBe('\ue023');
    el.remove();
  });

  it('« Sans condition » is a value like the others: « ou » after it, and another value adds to it', () => {
    const { fixture, el, open } = setup([NONE, MAIN, EXPEDITION]);
    open();
    el.querySelector<HTMLButtonElement>('[role=option]')!.click();
    fixture.detectChanges();
    expect(sequence(el)).toEqual([`chip:${NONE.text}`, 'ou', 'field']);
    open();
    el.querySelector<HTMLButtonElement>('[role=option]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.values()).toEqual([NONE, MAIN]);
    expect(sequence(el)).toEqual([`chip:${NONE.text}`, 'ou', `chip:${MAIN.text}`, 'ou', 'field']);
    el.remove();
  });

  it('after a tap, closes the list and leaves nothing focused or highlighted', () => {
    const { fixture, el, toggle, open } = setup([MAIN, EXPEDITION]);
    toggle.focus();
    open();
    expect(el.querySelector('[role=option].active')).toBeNull();
    el.querySelector<HTMLButtonElement>('[role=option]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.panel')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.contains(document.activeElement)).toBe(false);
    open();
    expect(el.querySelector('[role=option].active')).toBeNull();
    el.remove();
  });

  it('highlights an option only from the keyboard, and Enter gives the focus back to the button', () => {
    const { fixture, el, toggle } = setup([MAIN, EXPEDITION]);
    toggle.focus();
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('[role=option].active')?.textContent).toBe(MAIN.text);
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.values()).toEqual([EXPEDITION]);
    expect(el.querySelector('.panel')).toBeNull();
    expect(document.activeElement).toBe(toggle);
    el.remove();
  });
});
