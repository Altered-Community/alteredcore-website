import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AcCount } from '../../chips';
import { AcIcon, type AcIconName } from '../../icon';

export interface AcBottomNavItem {
  route: string;
  icon: AcIconName;
  label: string;
  badge?: number;
  badgeTone?: 'success' | 'dark';
  exact?: boolean;
}

/** Bottom navigation (compact only), above the gesture area. */
@Component({
  selector: 'ac-bottom-nav',
  imports: [RouterLink, RouterLinkActive, AcIcon, AcCount],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class AcBottomNav {
  readonly items = input<AcBottomNavItem[]>([]);
  readonly ariaLabel = input('Navigation');
}
