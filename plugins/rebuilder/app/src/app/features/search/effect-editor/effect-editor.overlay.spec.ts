import { TestBed } from '@angular/core/testing';
import { of, type Observable } from 'rxjs';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { CardsApiService, NO_CONDITION, toAbilityRefs, type AbilityKind } from '../../../core/cards-api.service';
import { ArOverlayRef } from '../../../ui/overlay';
import { EffectEditorOverlay, type EffectEditorData } from './effect-editor.overlay';

const MAIN: AbilityRef = { id: 1, text: 'Joué depuis la Main' };
const EXPEDITION: AbilityRef = { id: 2, text: 'Quitte la zone d’Expédition' };
const RAVITAILLEZ: AbilityRef = { id: 3, text: 'Ravitaillez' };
const SABOTEZ: AbilityRef = { id: 4, text: 'Sabotez' };

function sequence(combo: Element): string[] {
  return [...combo.children]
    .filter((el) => el.classList.contains('picked') || el.classList.contains('or') || el.classList.contains('field'))
    .map((el) => {
      if (el.classList.contains('or')) return 'ou';
      if (el.classList.contains('field')) return 'field';
      return `chip:${el.querySelector('span')?.textContent}`;
    });
}

/** The API rows the editor reads, through the real mapper. */
const ROWS: Record<AbilityKind, { alteredId: number; text: { fr: string } }[]> = {
  triggers: [
    { alteredId: 22, text: { fr: '{H}' } },
    { alteredId: 1, text: { fr: '{R}' } },
    { alteredId: 24, text: { fr: '{J}' } },
    { alteredId: 17, text: { fr: 'Au Crépuscule\u00a0' } },
  ],
  conditions: [
    { alteredId: 191, text: { fr: '[]' } },
    { alteredId: 188, text: { fr: 'Si vous contrôlez un jeton\u00a0:' } },
  ],
  effects: [{ alteredId: 3, text: { fr: '[Ravitaillez].' } }],
};

function setup(effect: EffectBlock, abilities: (kind: AbilityKind) => Observable<AbilityRef[]> = () => of([])) {
  const ref = new ArOverlayRef<EffectBlock, EffectEditorData>({ effect, index: 0 });
  TestBed.configureTestingModule({
    imports: [EffectEditorOverlay],
    providers: [
      { provide: ArOverlayRef, useValue: ref },
      { provide: CardsApiService, useValue: { abilities } },
    ],
  });
  const fixture = TestBed.createComponent(EffectEditorOverlay);
  fixture.detectChanges();
  return { fixture, ref, el: fixture.nativeElement as HTMLElement };
}

describe('EffectEditorOverlay « ou »', () => {
  function render(effect: EffectBlock): HTMLElement {
    return setup(effect).el;
  }

  it('uses the same « ou » before the add field on trigger, condition, and effect', () => {
    const el = render({
      id: 'e1',
      triggers: [],
      conditions: [MAIN],
      effects: [RAVITAILLEZ, SABOTEZ],
    });
    const combos = [...el.querySelectorAll('ar-combobox')];
    expect(combos).toHaveLength(3);
    expect(sequence(combos[0])).toEqual(['field']);
    expect(sequence(combos[1])).toEqual([`chip:${MAIN.text}`, 'ou', 'field']);
    expect(sequence(combos[2])).toEqual([`chip:${RAVITAILLEZ.text}`, 'ou', `chip:${SABOTEZ.text}`, 'ou', 'field']);
    // The add control now carries its label as text (« Ajouter » contains « ou »): count separators.
    expect(combos[0].querySelectorAll('.or')).toHaveLength(0);
  });

  it('keeps « ou » on every criterion that already has two values', () => {
    const el = render({
      id: 'e1',
      triggers: [MAIN, EXPEDITION],
      conditions: [MAIN, EXPEDITION],
      effects: [RAVITAILLEZ, SABOTEZ],
    });
    for (const combo of el.querySelectorAll('ar-combobox')) {
      const parts = sequence(combo);
      expect(parts.at(-2)).toBe('ou');
      expect(parts.at(-1)).toBe('field');
      expect(parts.filter((p) => p === 'ou')).toHaveLength(2);
    }
  });
});

describe('EffectEditorOverlay pickers', () => {
  const api = (kind: AbilityKind) => of(toAbilityRefs(ROWS[kind], kind === 'conditions' ? NO_CONDITION : undefined));
  const empty: EffectBlock = { id: 'e1', triggers: [], conditions: [], effects: [] };

  /** Opens a criterion; its list is a CDK overlay, rendered in the overlay container. */
  function open(el: HTMLElement, name: string, fixture: { detectChanges(): void }) {
    const toggle = el.querySelector<HTMLButtonElement>(`[role=combobox][aria-label="${name}"]`)!;
    toggle.click();
    fixture.detectChanges();
    const options = [...document.querySelectorAll<HTMLElement>('.cdk-overlay-container .panel [role=option]')];
    return { combo: toggle.closest('ar-combobox') as HTMLElement, toggle, options };
  }

  it('opens each criterion on a button, not on a focused text field', () => {
    const { el } = setup(empty, api);
    for (const combo of el.querySelectorAll('ar-combobox')) {
      const first = combo.querySelector('.field')!.firstElementChild!;
      expect(first.tagName).toBe('BUTTON');
      expect(first.getAttribute('role')).toBe('combobox');
      expect(combo.querySelector('input')).toBeNull();
    }
  });

  it('shows the hand, reserve and anywhere glyphs on the triggers', () => {
    const { el, fixture } = setup(empty, api);
    const { options } = open(el, 'Ajouter un déclencheur…', fixture);
    const glyphs = Object.fromEntries(
      options.map((o) => [o.textContent!.replace(/^[\ue000-\uf8ff]/, ''), o.querySelector('.glyph')?.textContent ?? null]),
    );
    expect(glyphs).toEqual({
      'Au Crépuscule': null,
      'Joué de partout': '\ue026',
      'Joué depuis la Main': '\ue023',
      'Joué depuis la Réserve': '\ue024',
    });
  });

  it('offers « Sans condition » first and applies it as the empty condition', () => {
    const { el, fixture, ref } = setup(empty, api);
    const { combo, options } = open(el, 'Ajouter une condition…', fixture);
    const first = options[0];
    expect(first.textContent).toBe('Sans condition');
    first.click();
    fixture.detectChanges();
    expect(sequence(combo)).toEqual(['chip:Sans condition', 'ou', 'field']);

    let applied: EffectBlock | undefined;
    ref.dialogRef = { close: (v) => (applied = v as EffectBlock) };
    el.querySelector<HTMLButtonElement>('.ar-overlay-footer button:last-child')!.click();
    expect(applied?.conditions).toEqual([{ id: 191, text: 'Sans condition' }]);
  });

  it('shows « ou » after the last value on Quand, Si and Alors alike, « Sans condition » included', () => {
    const { el } = setup(
      {
        id: 'e1',
        triggers: [{ id: 17, text: 'Au Crépuscule' }],
        conditions: [{ id: 191, text: 'Sans condition' }],
        effects: [{ id: 3, text: 'Ravitaillez' }],
      },
      api,
    );
    const combos = [...el.querySelectorAll('ar-combobox')];
    expect(combos.map(sequence)).toEqual([
      ['chip:Au Crépuscule', 'ou', 'field'],
      ['chip:Sans condition', 'ou', 'field'],
      ['chip:Ravitaillez', 'ou', 'field'],
    ]);
  });

  it('picking a value leaves every picker closed: the next criterion does not open', () => {
    const { el, fixture } = setup(empty, api);
    const { toggle, options } = open(el, 'Ajouter un déclencheur…', fixture);
    options[0].click();
    fixture.detectChanges();
    expect([...el.querySelectorAll('[role=combobox]')].map((t) => t.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);
    expect(document.querySelectorAll('.cdk-overlay-container .panel')).toHaveLength(0);
    expect(document.activeElement).toBe(toggle);
  });
});
