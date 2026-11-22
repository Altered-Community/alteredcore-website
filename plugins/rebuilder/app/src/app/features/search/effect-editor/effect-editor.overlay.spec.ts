import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { NO_CONDITION, UniquesApiService, toAbilityRefs, type AbilityKind, type UniquesEffect, type UniquesQuery } from '../../../core/uniques-api.service';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, type AcStepConfig } from '../../../ui/overlay';
import type { AbilityPickerData } from '../ability-picker/ability-picker.overlay';
import { EffectEditorOverlay, type EffectEditorData } from './effect-editor.overlay';

const MAIN: AbilityRef = { id: 1, text: 'Joué depuis la Main' };
const EXPEDITION: AbilityRef = { id: 2, text: 'Quitte la zone d’Expédition' };
const RAVITAILLEZ: AbilityRef = { id: 3, text: 'Ravitaillez' };
const SABOTEZ: AbilityRef = { id: 4, text: 'Sabotez' };

/** The API rows the editor reads, through the real mapper. */
const ROWS: Record<AbilityKind, { alteredId: number; text: { fr: string } }[]> = {
  triggers: [
    { alteredId: 22, text: { fr: '{H}' } },
    { alteredId: 1, text: { fr: '{R}' } },
    { alteredId: 24, text: { fr: '{J}' } },
    { alteredId: 17, text: { fr: 'Au Crépuscule ' } },
  ],
  conditions: [
    { alteredId: 191, text: { fr: '[]' } },
    { alteredId: 188, text: { fr: 'Si vous contrôlez un jeton :' } },
  ],
  effects: [
    { alteredId: 3, text: { fr: 'Ravitaillez' } },
    { alteredId: 4, text: { fr: 'Sabotez' } },
    { alteredId: 5, text: { fr: 'Piochez une carte.' } },
  ],
};
const api = (kind: AbilityKind) => of(toAbilityRefs(ROWS[kind], kind === 'conditions' ? NO_CONDITION : undefined));
const EMPTY: EffectBlock = { id: 'e1', triggers: [], conditions: [], effects: [] };

type Narrow = (query: UniquesQuery, index: number, block: UniquesEffect, kind: AbilityKind) => Observable<Set<number>>;

function setup(
  effect: EffectBlock,
  abilities: (kind: AbilityKind) => Observable<AbilityRef[]> = () => of([]),
  narrow?: { query: UniquesQuery; index: number; narrowAbilities: Narrow },
  width = 1440,
) {
  const ref = new AcOverlayRef<EffectBlock, EffectEditorData>({ effect, index: narrow?.index ?? 0, query: narrow?.query });
  TestBed.configureTestingModule({
    imports: [EffectEditorOverlay],
    providers: [
      { provide: AcOverlayRef, useValue: ref },
      { provide: UniquesApiService, useValue: { abilities, narrowAbilities: narrow?.narrowAbilities } },
    ],
  });
  TestBed.inject(AcBreakpointService).setWidth(width);
  const fixture = TestBed.createComponent(EffectEditorOverlay);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const detect = () => fixture.detectChanges();
  return { fixture, ref, el, detect };
}

const text = (node: Element) => node.textContent!.replace(/[-]/g, '').trim();

/** What a criterion card (or the compact criterion) shows: values and « ou », in order. */
function sequence(values: Element): string[] {
  return [...values.children].map((c) => (c.classList.contains('or') ? 'ou' : c.classList.contains('empty') ? `empty:${text(c)}` : `value:${text(c)}`));
}

const cards = (el: HTMLElement) => [...el.querySelectorAll('.card')];
const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLLabelElement>('ac-check-list .option')];
const listed = (el: HTMLElement) => rows(el).map(text);
function select(el: HTMLElement, label: string, detect: () => void) {
  [...el.querySelectorAll<HTMLButtonElement>('.card-head')].find((b) => b.textContent!.includes(label))!.click();
  detect();
}
function check(el: HTMLElement, value: string, detect: () => void) {
  rows(el)
    .find((r) => text(r) === value)!
    .querySelector('input')!
    .click();
  detect();
}

describe('EffectEditorOverlay window', () => {
  it('shows each criterion with its values joined by « ou », or what it matches when empty', () => {
    const { el } = setup({ id: 'e1', triggers: [], conditions: [MAIN], effects: [RAVITAILLEZ, SABOTEZ] });
    expect(cards(el).map((c) => text(c.querySelector('.card-head')!))).toEqual(['Quand · déclencheur', 'Si · condition', 'Alors · effet']);
    expect(cards(el).map((c) => sequence(c.querySelector('ac-or-values')!))).toEqual([
      ['empty:Tous les déclencheurs'],
      [`value:${MAIN.text}`],
      [`value:${RAVITAILLEZ.text}`, 'ou', `value:${SABOTEZ.text}`],
    ]);
  });

  it('lists the checkboxes of the selected criterion, triggers first, with their glyphs', () => {
    const { el, detect } = setup(EMPTY, api);
    expect(el.querySelector('.card.on')?.textContent).toContain('Quand');
    const glyphs = Object.fromEntries(rows(el).map((r) => [text(r), r.querySelector('.glyph')?.textContent ?? null]));
    expect(glyphs).toEqual({
      'Joué depuis la Main': '',
      'Joué depuis la Réserve': '',
      'Joué de partout': '',
      'Au Crépuscule': null,
    });
    select(el, 'Alors', detect);
    expect(listed(el)).toEqual(['Piochez une carte.', 'Ravitaillez', 'Sabotez']);
  });

  it('checks several values in a row: the list stays, rows keep their place, the card fills with « ou »', () => {
    const { el, ref, detect } = setup(EMPTY, api);
    select(el, 'Alors', detect);
    const before = listed(el);
    check(el, 'Sabotez', detect);
    check(el, 'Ravitaillez', detect);
    check(el, 'Piochez une carte.', detect);
    expect(listed(el)).toEqual(before);
    expect(rows(el).map((r) => r.querySelector('input')!.checked)).toEqual([true, true, true]);
    expect(sequence(cards(el)[2].querySelector('ac-or-values')!)).toEqual(['value:Sabotez', 'ou', 'value:Ravitaillez', 'ou', 'value:Piochez une carte.']);
    check(el, 'Ravitaillez', detect);

    let applied: EffectBlock | undefined;
    ref.dialogRef = { close: (v) => (applied = v as EffectBlock) };
    el.querySelector<HTMLButtonElement>('.ac-overlay-footer button:last-child')!.click();
    expect(applied?.effects.map((a) => a.text)).toEqual(['Sabotez', 'Piochez une carte.']);
  });

  it('offers « Sans condition » first and applies it as the empty condition', () => {
    const { el, ref, detect } = setup(EMPTY, api);
    select(el, 'Si', detect);
    expect(listed(el)[0]).toBe('Sans condition');
    check(el, 'Sans condition', detect);
    expect(sequence(cards(el)[1].querySelector('ac-or-values')!)).toEqual(['value:Sans condition']);

    let applied: EffectBlock | undefined;
    ref.dialogRef = { close: (v) => (applied = v as EffectBlock) };
    el.querySelector<HTMLButtonElement>('.ac-overlay-footer button:last-child')!.click();
    expect(applied?.conditions).toEqual([{ id: 191, text: 'Sans condition' }]);
  });

  it('removes a value from its card, and Enter in the search checks the first match', () => {
    const { el, detect } = setup({ ...EMPTY, triggers: [MAIN, EXPEDITION] }, api);
    cards(el)[0].querySelector<HTMLButtonElement>('ac-or-values button')!.click();
    detect();
    expect(sequence(cards(el)[0].querySelector('ac-or-values')!)).toEqual([`value:${EXPEDITION.text}`]);

    const search = el.querySelector<HTMLInputElement>('ac-check-list input[type=search]')!;
    search.value = 'crep';
    search.dispatchEvent(new Event('input'));
    detect();
    expect(listed(el)).toEqual(['Au Crépuscule']);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    detect();
    expect(search.value).toBe('');
    expect(listed(el)).toHaveLength(4);
    expect(sequence(cards(el)[0].querySelector('ac-or-values')!)).toEqual([`value:${EXPEDITION.text}`, 'ou', 'value:Au Crépuscule']);
  });
});

describe('EffectEditorOverlay compact', () => {
  it('shows each criterion with « ou » and opens its checkbox list as a step sharing the picked values', () => {
    const { el, ref, detect } = setup({ ...EMPTY, effects: [RAVITAILLEZ, SABOTEZ] }, api, undefined, 390);
    expect(el.querySelector('.cols')).toBeNull();
    const crits = [...el.querySelectorAll('.crit')];
    expect(crits.map((c) => c.querySelector('.add')!.textContent!.trim())).toEqual(['Ajouter un déclencheur', 'Ajouter une condition', 'Ajouter un effet']);
    expect(sequence(crits[2].querySelector('ac-or-values')!)).toEqual(['value:Ravitaillez', 'ou', 'value:Sabotez']);

    let step: AcStepConfig<AbilityPickerData> | undefined;
    ref.stepOpener = (_c, config) => {
      step = config as AcStepConfig<AbilityPickerData>;
      return new AcOverlayRef(config.data);
    };
    crits[2].querySelector<HTMLButtonElement>('.add')!.click();
    expect(step?.title).toBe('Alors');
    expect(step?.subtitle).toBe('effet');
    expect(step?.data?.options().map((o) => o.text)).toEqual(['Piochez une carte.', 'Ravitaillez', 'Sabotez']);
    step!.data!.picked.update((v) => [...v, { id: 5, text: 'Piochez une carte.' }]);
    detect();
    expect(sequence(el.querySelectorAll('.crit')[2].querySelector('ac-or-values')!)).toEqual(['value:Ravitaillez', 'ou', 'value:Sabotez', 'ou', 'value:Piochez une carte.']);
  });
});

describe('EffectEditorOverlay narrowing', () => {
  const query: UniquesQuery = { factions: ['AX'], sets: [], mainCosts: [], recallCosts: [], effects: [] };

  it('lists only the values the API says still give a card, with the block as picked', () => {
    const calls: { index: number; block: UniquesEffect; kind: AbilityKind }[] = [];
    const allowed: Record<AbilityKind, number[]> = { triggers: [24, 17], conditions: [188], effects: [] };
    const narrowAbilities: Narrow = (_q, index, block, kind) => {
      calls.push({ index, block, kind });
      return of(new Set(allowed[kind]));
    };
    const { el, detect } = setup({ ...EMPTY, effects: [RAVITAILLEZ] }, api, { query, index: 1, narrowAbilities });
    expect(listed(el)).toEqual(['Au Crépuscule', 'Joué de partout']);
    select(el, 'Si', detect);
    expect(listed(el)).toEqual(['Si vous contrôlez un jeton']);
    // A picked value stays on its card even when the API no longer offers it.
    select(el, 'Alors', detect);
    expect(listed(el)).toEqual([]);
    expect(cards(el)[2].textContent).toContain('Ravitaillez');
    expect(calls).toEqual(
      (['triggers', 'conditions', 'effects'] as AbilityKind[]).map((kind) => ({ index: 1, block: { triggers: [], conditions: [], effects: [3] }, kind })),
    );
  });

  it('asks again for the other criteria when a value is checked, never for the list being checked', () => {
    const asked: [AbilityKind, UniquesEffect][] = [];
    const narrowAbilities: Narrow = (_q, _i, block, kind) => {
      asked.push([kind, block]);
      return kind === 'conditions' ? throwError(() => new Error('down')) : of(new Set(kind === 'triggers' ? [24, 22] : [3, 4, 5]));
    };
    const { el, detect } = setup(EMPTY, api, { query, index: 0, narrowAbilities });
    const before = listed(el);
    asked.length = 0;
    check(el, 'Joué de partout', detect);
    check(el, 'Joué depuis la Main', detect);
    expect(listed(el)).toEqual(before);
    expect(asked.map(([kind]) => kind)).toEqual(['conditions', 'effects', 'conditions', 'effects']);
    expect(asked.at(-1)![1]).toEqual({ triggers: [24, 22], conditions: [], effects: [] });
    // The API failed for the conditions: their whole list stays.
    select(el, 'Si', detect);
    expect(listed(el)).toEqual(['Sans condition', 'Si vous contrôlez un jeton']);
  });

  it('shows every value without the search it belongs to, or for an exact reference', () => {
    const narrowAbilities: Narrow = () => {
      throw new Error('not called');
    };
    const { el } = setup(EMPTY, api, { query: { ...query, reference: 'ALT_CORE_B_AX_04_U_1' }, index: 0, narrowAbilities });
    expect(listed(el)).toHaveLength(4);
  });
});
