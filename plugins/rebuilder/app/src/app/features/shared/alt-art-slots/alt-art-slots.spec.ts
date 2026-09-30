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
  function setup(result: 'ok' | 409) {
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
    fixture.componentRef.setInput('choice', CHOICE);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, saved };
  }

  it('moves the active copy onto an owned illustration and saves the slots', () => {
    const { fixture, el, saved } = setup('ok');
    el.querySelectorAll<HTMLButtonElement>('.tile')[1].click();
    fixture.detectChanges();
    expect(saved).toEqual([['ALT_CORE_B_AX_04_C', 'ALT_CORE_B_AX_04_C', 'ALT_CORE_A_AX_04_C']]);
    expect(el.querySelectorAll('li')[1].querySelectorAll('.marker')).toHaveLength(1);
    expect(el.querySelectorAll<HTMLButtonElement>('.tile')[2].disabled).toBe(true);
  });

  it('puts the copy back with the reason when the site refuses', () => {
    const { fixture, el } = setup(409);
    el.querySelectorAll<HTMLButtonElement>('.tile')[1].click();
    fixture.detectChanges();
    expect(el.querySelectorAll('li')[1].querySelectorAll('.marker')).toHaveLength(0);
    expect(el.querySelector('.error')?.textContent).toContain('ALT_CORE_A_AX_04_C (3/2)');
  });
});
