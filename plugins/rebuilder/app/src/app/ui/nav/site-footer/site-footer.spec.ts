import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AR_SITE_FOOTER_DISCLAIMER, ArSiteFooter } from './site-footer';

describe('ArSiteFooter', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(ArSiteFooter);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ArSiteFooter],
      providers: [provideRouter([])],
    });
  });

  it('shows the fan-content logo, the legal mention, and the footer links', () => {
    const el = render();
    const footer = el.querySelector('footer');
    expect(footer).not.toBeNull();

    const logo = el.querySelector('img');
    expect(logo?.getAttribute('alt')).toBe('Altered Fan Content');
    expect(logo?.getAttribute('src')).toBe('assets/img/altered-fan-content.png');

    expect(el.querySelector('.disclaimer')?.textContent?.trim()).toBe(AR_SITE_FOOTER_DISCLAIMER);
    expect(AR_SITE_FOOTER_DISCLAIMER).toBe(
      "Altered Re:Builder est un site communautaire non officiel et n'est pas affilié à Equinox.",
    );

    const nav = el.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Liens du pied de page');
    const internal = [...el.querySelectorAll('nav a[href^="/"]')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(internal).toEqual([
      ['Actualités', '/actualites'],
      ['Cartes', '/cartes'],
      ['Decks', '/decks'],
    ]);

    const external = el.querySelector('a.external');
    expect(external?.getAttribute('href')).toBe('https://boardgamearena.com/gamepanel?game=altered');
    expect(external?.getAttribute('target')).toBe('_blank');
    expect(external?.getAttribute('rel')).toBe('noopener');
    expect(external?.textContent).toContain('Board Game Arena');
    expect(external?.querySelector('.ar-sr-only')?.textContent).toBe('(nouvel onglet)');
    expect(external?.querySelector('ar-icon')).not.toBeNull();
  });
});
