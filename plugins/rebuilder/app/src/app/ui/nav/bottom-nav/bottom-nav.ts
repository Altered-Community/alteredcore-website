import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, type Params } from '@angular/router';
import { AcCount } from '../../chips';
import { AcIcon, type AcIconName } from '../../icon';

export interface AcBottomNavItem {
  route: string;
  /**
   * Set by the page when the router cannot tell (tabs of one page, `?tab=`): replaces `routerLinkActive`,
   * and the link takes `queryParams` instead of keeping those of the URL.
   */
  active?: boolean;
  queryParams?: Params;
  icon: AcIconName;
  label: string;
  badge?: number;
  badgeTone?: 'success' | 'dark';
  exact?: boolean;
}

/** Bottom navigation (compact only), above the gesture area. */
@Component({
  selector: 'ac-bottom-nav',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, AcIcon, AcCount],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class AcBottomNav {
  readonly items = input<AcBottomNavItem[]>([]);
  readonly ariaLabel = input('Navigation');
}
