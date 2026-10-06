import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AbilityRef } from '../../../core/card-filters';
import { AcOverlayRef } from '../../../ui/overlay';
import { AbilityPickerStep, type AbilityPickerData } from './ability-picker.overlay';

const OPTIONS: AbilityRef[] = [
  { id: 3, text: 'Ravitaillez' },
  { id: 4, text: 'Sabotez' },
  { id: 5, text: 'Piochez une carte.' },
];

function setup(picked: AbilityRef[]) {
  const data: AbilityPickerData = {
    options: signal(OPTIONS),
    picked: signal(picked),
    label: 'effet',
    searchPlaceholder: 'Rechercher un effet…',
  };
  const ref = new AcOverlayRef<void, AbilityPickerData>(data);
  TestBed.configureTestingModule({ imports: [AbilityPickerStep], providers: [{ provide: AcOverlayRef, useValue: ref }] });
  const fixture = TestBed.createComponent(AbilityPickerStep);
  fixture.detectChanges();
  return { data, ref, el: fixture.nativeElement as HTMLElement, detect: () => fixture.detectChanges() };
}

describe('AbilityPickerStep', () => {
  it('gives the sheet to the list, which stays open while values are checked', () => {
    const { el, data, detect } = setup([]);
    expect(el.querySelector('ac-or-values')).toBeNull();
    const boxes = () => [...el.querySelectorAll<HTMLInputElement>('ac-check-list input[type=checkbox]')];
    boxes()[1].click();
    detect();
    boxes()[0].click();
    detect();
    expect(boxes()).toHaveLength(3);
    expect(data.picked().map((a) => a.id)).toEqual([4, 3]);
  });

  it('unchecks everything from the header, and « Valider » goes back', () => {
    const { ref, data, el } = setup([OPTIONS[0], OPTIONS[1]]);
    ref.headerAction()!.run();
    expect(data.picked()).toEqual([]);
    let closed = false;
    ref.dialogRef = { close: () => (closed = true) };
    el.querySelector<HTMLButtonElement>('.ac-overlay-footer button')!.click();
    expect(closed).toBe(true);
  });
});
