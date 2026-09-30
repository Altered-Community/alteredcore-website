import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, type Params } from '@angular/router';
import { ArCount } from '../../chips';
import { ArIcon, type ArIconName } from '../../icon';

export interface ArBottomNavItem {
  route: string;
  /**
   * Set by the page when the router cannot tell (tabs of one page, `?tab=`): replaces `routerLinkActive`,
   * and the link takes `queryParams` instead of keeping those of the URL.
   */
  active?: boolean;
  queryParams?: Params;
  icon: ArIconName;
  label: string;
  badge?: number;
  badgeTone?: 'success' | 'dark';
  exact?: boolean;
}

/** Bottom navigation (compact only), above the gesture area. */
@Component({
  selector: 'ar-bottom-nav',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, ArIcon, ArCount],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class ArBottomNav {
  readonly items = input<ArBottomNavItem[]>([]);
  readonly ariaLabel = input('Navigation');
}
