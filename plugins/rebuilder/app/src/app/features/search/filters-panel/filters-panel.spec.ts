import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { defaultFilters, type SearchFilters } from '../../../core/card-filters';
import { PROMO_SETS } from '../../../core/card-vocabulary';
import { FiltersPanel } from './filters-panel';

describe('FiltersPanel (promo editions & builder/browse modes)', () => {
  let http: HttpTestingController;

  function setup(initial: SearchFilters, factionFilter = true) {
    TestBed.configureTestingModule({
      imports: [FiltersPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(FiltersPanel);
    fixture.componentRef.setInput('value', initial);
    fixture.componentRef.setInput('factionFilter', factionFilter);
    fixture.detectChanges();
    // Flush initial artists request
    http.match((r) => r.url.endsWith('/api/v2/artists')).forEach((r) => r.flush({ artists: [] }));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const done = () => {
      http.match(() => true).forEach((r) => r.flush({}));
      fixture.destroy();
      el.remove();
    };
    return { fixture, el, done };
  }

  it('checks and unchecks promo edition checkboxes live without closing the dropdown, with homogenized combobox UI', () => {
    const { fixture, el, done } = setup({ ...defaultFilters('all'), sets: ['DUSTER'], altArts: 'with' });

    // Promo editions combobox lives inside the Illustrations filter section with no .adv-label wrapper (same UI as Subtype/Artist)
    const promoToggle = el.querySelector<HTMLButtonElement>('button[role=combobox][aria-label="Éditions promo"]');
    expect(promoToggle).not.toBeNull();
    expect(promoToggle!.closest('.adv-field')).toBeNull();
    expect(promoToggle!.closest('ac-filter-section')?.querySelector('.title')?.textContent?.trim()).toBe('Illustrations');

    // Open the dropdown and select the first promo edition
    promoToggle!.click();
    fixture.detectChanges();
    const panel = () => document.querySelector<HTMLElement>('.cdk-overlay-container .panel');
    const opts = () => [...(panel()?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];
    expect(opts().length).toBeGreaterThan(1);
    expect(opts().every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);

    // Clicking an option immediately updates both filters.promoSets AND the live checkbox state while open
    opts()[0].click();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();
    expect(fixture.componentInstance.value().promoSets).toEqual([PROMO_SETS[0].code]);
    expect(opts()[0].getAttribute('aria-selected')).toBe('true');
    expect(opts()[1].getAttribute('aria-selected')).toBe('false');

    // Clicking a second option checks it immediately too
    opts()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value().promoSets).toEqual([PROMO_SETS[0].code, PROMO_SETS[1].code]);
    expect(opts()[0].getAttribute('aria-selected')).toBe('true');
    expect(opts()[1].getAttribute('aria-selected')).toBe('true');

    // Clicking the first option again unchecks it immediately
    opts()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value().promoSets).toEqual([PROMO_SETS[1].code]);
    expect(opts()[0].getAttribute('aria-selected')).toBe('false');
    expect(opts()[1].getAttribute('aria-selected')).toBe('true');

    done();
  });

  it('matches standard browse vs builder type/faction visibility', () => {
    const browse = setup(defaultFilters('all'), true);
    const browseTypes = [...browse.el.querySelectorAll('[aria-label="Type de carte"] button')].map((b) => b.textContent?.trim());
    expect(browseTypes).toContain('Héros');
    expect(browseTypes).toContain('Jeton et mana');
    expect(browse.el.querySelector('[aria-label="Faction"]')).not.toBeNull();
    browse.done();

    TestBed.resetTestingModule();
    const builder = setup(defaultFilters('all'), false);
    const builderTypes = [...builder.el.querySelectorAll('[aria-label="Type de carte"] button')].map((b) => b.textContent?.trim());
    expect(builderTypes).not.toContain('Héros');
    expect(builderTypes).not.toContain('Jeton et mana');
    expect(builder.el.textContent).toContain('Changer de faction');
    builder.done();
  });
});
