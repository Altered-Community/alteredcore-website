import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArIcon } from '../../icon';
import { type ArNavLink } from '../app-bar/app-bar';

export interface ArExternalLink {
  label: string;
  href: string;
}

/** Exact legal line from `design/features/actualites-pied-de-page.md`. */
export const AR_SITE_FOOTER_DISCLAIMER =
  "Altered Re:Builder est un site communautaire non officiel et n'est pas affilié à Equinox.";

export const AR_SITE_FOOTER_LOGO = 'assets/img/altered-fan-content.png';

/** Internal destinations. Actualités is linked before that screen exists. */
export const AR_SITE_FOOTER_LINKS: ArNavLink[] = [
  { label: 'Actualités', route: '/actualites' },
  { label: 'Cartes', route: '/cartes' },
  { label: 'Decks', route: '/decks' },
];

export const AR_SITE_FOOTER_EXTERNAL: ArExternalLink[] = [
  { label: 'Board Game Arena', href: 'https://boardgamearena.com/gamepanel?game=altered' },
];

/**
 * Shared site footer (Pied-1). Not sticky: the page is a flex column with
 * `min-height: 100dvh`, so a short page still pins this block to the window bottom.
 */
@Component({
  selector: 'ar-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ArIcon],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class ArSiteFooter {
  readonly links = input<ArNavLink[]>(AR_SITE_FOOTER_LINKS);
  readonly externalLinks = input<ArExternalLink[]>(AR_SITE_FOOTER_EXTERNAL);
  readonly disclaimer = input(AR_SITE_FOOTER_DISCLAIMER);
  readonly logoSrc = input(AR_SITE_FOOTER_LOGO);
  readonly logoAlt = input('Altered Fan Content');
}
