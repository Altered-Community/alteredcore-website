import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ArCount } from '../../chips';
import { ArIcon, type ArIconName } from '../../icon';

export interface ArBottomNavItem {
  route: string;
  icon: ArIconName;
  label: string;
  badge?: number;
  badgeTone?: 'success' | 'dark';
  exact?: boolean;
}

/** Bottom navigation (compact only), above the gesture area. */
@Component({
  selector: 'ar-bottom-nav',
  imports: [RouterLink, RouterLinkActive, ArIcon, ArCount],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class ArBottomNav {
  readonly items = input<ArBottomNavItem[]>([]);
  readonly ariaLabel = input('Navigation');
}
