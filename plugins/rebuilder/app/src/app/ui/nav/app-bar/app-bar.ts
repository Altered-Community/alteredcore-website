import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ArNavLink {
  label: string;
  route: string;
  /** Active only on this exact URL (e.g. the home page), not on its children. */
  exact?: boolean;
}

/**
 * Application bar — DS-Navigation.
 * `expanded`: logo + site nav + projected `[actions]`; `compact`: projected `[leading]`, title / subtitle, `[actions]`.
 */
@Component({
  selector: 'ar-app-bar',
  imports: [RouterLink, RouterLinkActive],
  host: { '[class]': "'ar-app-bar--' + appearance()" },
  templateUrl: './app-bar.html',
  styleUrl: './app-bar.scss',
})
export class ArAppBar {
  readonly appearance = input<'expanded' | 'compact'>('expanded');
  readonly title = input('');
  readonly subtitle = input('');
  readonly links = input<ArNavLink[]>([]);
}
