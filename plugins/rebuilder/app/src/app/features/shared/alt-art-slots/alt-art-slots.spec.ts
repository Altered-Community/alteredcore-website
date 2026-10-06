import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OwnershipApiService, type AltArtChoice } from '../../../core/ownership-api.service';
import { AltArtSlots } from './alt-art-slots';

const CHOICE: AltArtChoice = {
  family: { familyId: 7, faction: 'AX', rarity: 'COMMON' },
  options: {
    options: [
      { reference: 'ALT_CORE_B_AX_04_C', ownedQuantity: null },
      { reference: 'ALT_CORE_A_AX_04_C', ownedQuantity: 2 },
      { reference: 'ALT_CORE_P_AX_04_C', ownedQuantity: 0 },
    ],
    slots: [0, 1, 2].map((slotIndex) => ({ slotIndex, reference: 'ALT_CORE_B_AX_04_C' })),
  },
};

describe('AltArtSlots', () => {
  function setup(result: 'ok' | 409, choice: AltArtChoice = CHOICE) {
    const saved: string[][] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OwnershipApiService,
          useValue: {
            setAltArtPreference: (_f: unknown, refs: string[]) => {
              saved.push(refs);
              return result === 'ok' ? of(undefined) : throwError(() => new HttpErrorResponse({ status: 409, error: [{ reference: 'ALT_CORE_A_AX_04_C', requested: 3, owned: 2 }] }));
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AltArtSlots);
    fixture.componentRef.setInput('choice', choice);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, saved };
  }

  it('moves the copies onto an owned illustration in order, from the first, and saves the slots', () => {
    const { fixture, el, saved } = setup('ok');
    el.querySelectorAll<HTMLButtonElement>('.tile')[1].click();
    fixture.detectChanges();
    expect(saved).toEqual([['ALT_CORE_A_AX_04_C', 'ALT_CORE_B_AX_04_C', 'ALT_CORE_B_AX_04_C']]);
    expect([...el.querySelectorAll('li')[1].querySelectorAll('.marker')].map((m) => m.textContent?.trim())).toEqual(['1']);
    expect(el.querySelectorAll<HTMLButtonElement>('.tile')[2].disabled).toBe(true);
  });

  it('puts the copy back with the reason when the site refuses', () => {
    const { fixture, el } = setup(409);
    el.querySelectorAll<HTMLButtonElement>('.tile')[1].click();
    fixture.detectChanges();
    expect(el.querySelectorAll('li')[1].querySelectorAll('.marker')).toHaveLength(0);
    expect(el.querySelector('.error')?.textContent).toContain('ALT_CORE_A_AX_04_C (3/2)');
  });

  it('numbers the copies 1, 2, 3 whatever the API\'s slot indexes', () => {
    const fromOne = { ...CHOICE, options: { ...CHOICE.options, slots: [1, 2, 3].map((slotIndex) => ({ slotIndex, reference: 'ALT_CORE_B_AX_04_C' })) } };
    const { el } = setup('ok', fromOne);
    const markers = [...el.querySelectorAll<HTMLButtonElement>('li:first-child .marker')];
    expect(markers.map((m) => m.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(markers.map((m) => m.getAttribute('aria-label'))).toEqual(['Exemplaire 1', 'Exemplaire 2', 'Exemplaire 3']);
  });

  it('shows one marker without a number for a family with one copy (token, hero)', () => {
    const token = { ...CHOICE, options: { ...CHOICE.options, slots: [{ slotIndex: 1, reference: 'ALT_CORE_A_AX_04_C' }] } };
    const { fixture, el, saved } = setup('ok', token);
    const marker = el.querySelector('li:nth-child(2) .marker');
    expect(marker?.textContent?.trim()).toBe('');
    expect(marker?.getAttribute('aria-label')).toBe('Illustration choisie');
    expect(el.querySelectorAll('.marker')).toHaveLength(1);
    el.querySelectorAll<HTMLButtonElement>('.tile')[0].click();
    fixture.detectChanges();
    expect(saved).toEqual([['ALT_CORE_B_AX_04_C']]);
    expect(el.querySelector('li:nth-child(1) .marker')).not.toBeNull();
  });
});
