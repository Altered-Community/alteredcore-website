import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AcCombobox, type ComboOption } from './combobox';

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

describe('AcCombobox « ou »', () => {
  function render(values: ComboOption[]): HTMLElement {
    const fixture = TestBed.createComponent(AcCombobox);
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

describe('AcCombobox picker', () => {
  const HAND: ComboOption = { id: 22, text: 'Joué depuis la Main', glyph: '' };
  const NONE: ComboOption = { id: 191, text: 'Sans condition' };

  /** The list is a CDK overlay: it renders in the overlay container, not inside the component. */
  const panel = () => document.querySelector<HTMLElement>('.cdk-overlay-container .panel');
  const options = () => [...(panel()?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];

  function setup(opts: ComboOption[], values: ComboOption[] = []) {
    const fixture = TestBed.createComponent(AcCombobox);
    fixture.componentRef.setInput('options', opts);
    fixture.componentRef.setInput('values', values);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const toggle = el.querySelector<HTMLButtonElement>('.field [role=combobox]')!;
    const open = () => {
      toggle.click();
      fixture.detectChanges();
    };
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const done = () => {
      fixture.destroy();
      el.remove();
    };
    return { fixture, el, toggle, open, settle, done };
  }

  it('opens a list on a button, without a text field and without moving focus to one', () => {
    const { el, toggle, open, done } = setup([MAIN, EXPEDITION]);
    expect(el.querySelector('.field input')).toBeNull();
    expect(toggle.tagName).toBe('BUTTON');
    toggle.focus();
    open();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // The first control of the list is the search field, but it stays unfocused: no touch keyboard.
    const search = panel()!.querySelector('input')!;
    expect(document.activeElement).not.toBe(search);
    expect(document.activeElement).toBe(toggle);
    expect(options().map((o) => o.textContent)).toEqual([MAIN.text, EXPEDITION.text]);
    expect(panel()!.querySelector('[role=listbox]')?.id).toBe(toggle.getAttribute('aria-controls'));
    done();
  });

  it('picks a value without typing, and still filters when the user types', () => {
    const { fixture, open, done } = setup([MAIN, EXPEDITION]);
    open();
    options()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.values()).toEqual([MAIN]);
    expect(panel()).toBeNull();

    open();
    const search = panel()!.querySelector('input')!;
    search.value = 'expé';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(options().map((o) => o.textContent)).toEqual([EXPEDITION.text]);
    done();
  });

  it('shows the glyph in the option and on the chip', () => {
    const { fixture, el, open, done } = setup([HAND]);
    open();
    expect(options()[0].querySelector('.glyph')?.textContent).toBe('');
    options()[0].click();
    fixture.detectChanges();
    expect(el.querySelector('.picked .glyph')?.textContent).toBe('');
    done();
  });

  it('« Sans condition » is a value like the others: « ou » after it, and another value adds to it', () => {
    const { fixture, el, open, done } = setup([NONE, MAIN, EXPEDITION]);
    open();
    options()[0].click();
    fixture.detectChanges();
    expect(sequence(el)).toEqual([`chip:${NONE.text}`, 'ou', 'field']);
    open();
    options()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.values()).toEqual([NONE, MAIN]);
    expect(sequence(el)).toEqual([`chip:${NONE.text}`, 'ou', `chip:${MAIN.text}`, 'ou', 'field']);
    done();
  });

  it('after a pick, closes the list and gives the focus back to the button', () => {
    const { fixture, toggle, open, done } = setup([MAIN, EXPEDITION]);
    open();
    expect(panel()!.querySelector('.cdk-option-active')).toBeNull();
    options()[0].click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    done();
  });

  it('closes on a press outside, and on the button', () => {
    const { fixture, toggle, open, done } = setup([MAIN]);
    open();
    document.body.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
    open();
    toggle.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
    done();
  });

  it('arrows move into the list, Enter picks and gives the focus back to the button', async () => {
    const { fixture, toggle, settle, done } = setup([MAIN, EXPEDITION]);
    toggle.focus();
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle();
    expect(document.activeElement?.textContent).toBe(MAIN.text);
    const listbox = panel()!.querySelector<HTMLElement>('[role=listbox]')!;
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    await settle();
    expect(panel()!.querySelector('.cdk-option-active')?.textContent).toBe(EXPEDITION.text);
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    await settle();
    expect(fixture.componentInstance.values()).toEqual([EXPEDITION]);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(toggle);
    done();
  });

  it('Escape closes the list and gives the focus back to the button', async () => {
    const { toggle, open, settle, done } = setup([MAIN]);
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(toggle);
    done();
  });

  it('a letter on the button starts a search, Enter in it picks the first match', async () => {
    const { fixture, toggle, settle, done } = setup([MAIN, EXPEDITION]);
    toggle.focus();
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
    await settle();
    const search = panel()!.querySelector('input')!;
    expect(document.activeElement).toBe(search);
    expect(search.value).toBe('q');
    expect(options().map((o) => o.textContent)).toEqual([EXPEDITION.text]);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
    expect(fixture.componentInstance.values()).toEqual([EXPEDITION]);
    done();
  });
});

/** The component and its CDK overlay container in a shadow root, as in the plugin (`ShadowOverlayContainer`). */
const shadowHost = document.createElement('div');
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

// A test double of the plugin's container: @Injectable because OverlayContainer takes constructor deps.
@Injectable()
class TestShadowOverlayContainer extends OverlayContainer {
  protected override _createContainer(): void {
    const container = this._document.createElement('div');
    container.classList.add('cdk-overlay-container');
    shadowRoot.appendChild(container);
    this._containerElement = container;
  }
}

describe('AcCombobox in a shadow root', () => {
  beforeEach(() => {
    document.body.appendChild(shadowHost);
    TestBed.configureTestingModule({ providers: [{ provide: OverlayContainer, useClass: TestShadowOverlayContainer }] });
  });
  afterEach(() => shadowHost.remove());

  it('a press on an option picks it, a press elsewhere in the shadow root closes the list', () => {
    const fixture = TestBed.createComponent(AcCombobox);
    fixture.componentRef.setInput('options', [MAIN, EXPEDITION]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    shadowRoot.appendChild(el);
    const panel = () => shadowRoot.querySelector<HTMLElement>('.cdk-overlay-container .panel');
    const press = (target: Element) => {
      // Seen from `document`, the target of these events is `shadowHost`, not `target`.
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      fixture.detectChanges();
    };

    press(el.querySelector('[role=combobox]')!);
    expect(panel()).not.toBeNull();
    press(panel()!.querySelector('[role=option]')!);
    expect(fixture.componentInstance.values()).toEqual([MAIN]);
    expect(panel()).toBeNull();

    press(el.querySelector('[role=combobox]')!);
    press(shadowRoot.appendChild(document.createElement('p')));
    expect(panel()).toBeNull();
    fixture.destroy();
  });
});
