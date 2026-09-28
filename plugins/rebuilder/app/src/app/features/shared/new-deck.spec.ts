import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CardsApiService, type HeroGroup } from '../../core/cards-api.service';
import { ArOverlayRef } from '../../ui/overlay';
import { NewDeckForm } from './new-deck.form';
import { NewDeckOverlay, type NewDeckResult } from './new-deck/new-deck.overlay';

const SIERRA = { reference: 'ALT_CORE_B_AX_01_C', name: 'Sierra & Oddball', faction: 'AX' };
const TREYST = { reference: 'ALT_CORE_B_AX_02_C', name: 'Treyst & Rossum', faction: 'AX' };
const MOYO = { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' };

describe('NewDeckForm (Nouveau deck)', () => {
  it('defaults to Privé and Standard All Uniques, with no hero and an empty name', () => {
    const form = new NewDeckForm();
    expect(form.isPublic()).toBe(false);
    expect(form.format()).toBe('standard');
    expect(form.hero()).toBeNull();
    expect(form.name()).toBe('');
  });

  it('empty name → picking a hero generates « Deck <héros> »', () => {
    const form = new NewDeckForm();
    form.selectHero(SIERRA);
    expect(form.name()).toBe('Deck Sierra & Oddball');
  });

  it('generated name → picking another hero regenerates it', () => {
    const form = new NewDeckForm();
    form.selectHero(SIERRA);
    form.selectHero(MOYO);
    expect(form.name()).toBe('Deck Moyo & Silk');
    expect(form.hero()).toEqual(MOYO);
  });

  it('typed name → kept when the hero changes', () => {
    const form = new NewDeckForm();
    form.selectHero(SIERRA);
    form.editName('Moyo Embrasement');
    form.selectHero(MOYO);
    expect(form.name()).toBe('Moyo Embrasement');

    const typedFirst = new NewDeckForm();
    typedFirst.editName('Mon deck');
    typedFirst.selectHero(TREYST);
    expect(typedFirst.name()).toBe('Mon deck');
  });

  it('a name cleared by the user is generated again on the next hero', () => {
    const form = new NewDeckForm();
    form.editName('Brouillon');
    form.editName('  ');
    form.selectHero(TREYST);
    expect(form.name()).toBe('Deck Treyst & Rossum');
  });

  it('is ready only with a hero and a non-blank name', () => {
    const form = new NewDeckForm();
    expect(form.ready()).toBe(false);
    form.editName('Moyo Embrasement');
    expect(form.ready()).toBe(false);
    form.selectHero(MOYO);
    expect(form.ready()).toBe(true);
    form.editName('   ');
    expect(form.ready()).toBe(false);
    expect(form.result()).toBeNull();
  });

  it('builds an unchanged NewDeckResult', () => {
    const form = new NewDeckForm();
    form.selectHero(MOYO);
    form.editName('  Moyo Embrasement ');
    form.format.set('frontier');
    form.isPublic.set(true);
    expect(form.result()).toEqual({ name: 'Moyo Embrasement', hero: MOYO, format: 'frontier', isPublic: true });
  });
});

describe('NewDeckOverlay', () => {
  const heroes: HeroGroup[] = [
    { slug: 'sierra', ...SIERRA },
    { slug: 'treyst', ...TREYST },
    { slug: 'moyo', ...MOYO },
  ];
  let closed: (NewDeckResult | undefined)[];

  function setup() {
    closed = [];
    const ref = new ArOverlayRef<NewDeckResult>(undefined);
    ref.dialogRef = { close: (r?: unknown) => closed.push(r as NewDeckResult | undefined) };
    TestBed.configureTestingModule({
      imports: [NewDeckOverlay],
      providers: [
        provideRouter([]),
        { provide: ArOverlayRef, useValue: ref },
        { provide: CardsApiService, useValue: { heroes: () => of(heroes) } },
      ],
    });
    const fixture = TestBed.createComponent(NewDeckOverlay);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const create = () => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Créer le deck'))!;
    const tile = (name: string) => [...el.querySelectorAll<HTMLButtonElement>('ar-hero-tile button')].find((b) => b.textContent?.includes(name))!;
    const nameInput = () => el.querySelector<HTMLInputElement>('ar-input input')!;
    return { fixture, el, create, tile, nameInput };
  }

  it('enables « Créer le deck » once a hero is picked, and pre-fills the name', () => {
    const { fixture, create, tile, nameInput } = setup();
    expect(create().disabled).toBe(true);
    tile('Sierra & Oddball').click();
    fixture.detectChanges();
    expect(nameInput().value).toBe('Deck Sierra & Oddball');
    expect(create().disabled).toBe(false);
    expect(tile('Sierra & Oddball').getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the hero selected when switching faction, and Entrée in the name creates the deck', () => {
    const { fixture, el, tile, nameInput } = setup();
    tile('Treyst & Rossum').click();
    fixture.detectChanges();
    const yzmir = [...el.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => b.textContent?.includes('Yzmir'))!;
    yzmir.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Sélection : Treyst & Rossum · Axiom');

    const input = nameInput();
    input.value = 'Mon deck';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(closed).toEqual([{ name: 'Mon deck', hero: TREYST, format: 'standard', isPublic: false }]);
  });
});
