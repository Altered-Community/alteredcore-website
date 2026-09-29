import { Component, ElementRef, afterRenderEffect, inject, input, model, viewChildren } from '@angular/core';
import { ArDensityService } from '../../layout.services';
import { FACTIONS } from '../factions';
import { scrollIntoViewInline } from '../scroll';

/**
 * Faction tablist. `size="sm"`: 36 px pills; `layout="grid"`: equal columns, `scroll`: one row that scrolls
 * horizontally and keeps the active tab in view. Arrow keys / Home / End move between tabs (roving tabindex).
 */
@Component({
  selector: 'ar-faction-tabs',
  host: {
    role: 'tablist',
    'aria-label': 'Faction',
    '[class.sm]': "size() === 'sm'",
    '[class.grid]': "layout() === 'grid'",
    '[class.touch]': "density.density() === 'touch'",
    '[style.--ar-faction-cols]': 'columns()',
    '(keydown)': 'onKeydown($event)',
  },
  templateUrl: './faction-tabs.html',
  styleUrl: './faction-tabs.scss',
})
export class ArFactionTabs {
  readonly active = model<string>('AX');
  readonly size = input<'sm' | 'md'>('md');
  readonly layout = input<'scroll' | 'grid'>('scroll');
  /** Grid columns (`layout="grid"`): 6 on one row, 3 on two rows when the space is narrow. */
  readonly columns = input<6 | 3>(6);
  /** Id of the tab panel (hero grid) the tabs control. */
  readonly controls = input('');
  protected readonly factions = FACTIONS;
  protected readonly density = inject(ArDensityService);
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  constructor() {
    // Scroll layout: keep the active tab visible (initial faction, keyboard navigation).
    afterRenderEffect(() => {
      const i = this.factions.findIndex((f) => f.code === this.active());
      const el = this.tabs()[i]?.nativeElement;
      if (el && this.layout() === 'scroll') scrollIntoViewInline(el);
    });
  }

  protected activate(code: string): void {
    this.active.set(code);
  }

  protected onKeydown(e: KeyboardEvent): void {
    const i = this.factions.findIndex((f) => f.code === this.active());
    const n = this.factions.length;
    const next =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    this.active.set(this.factions[next].code);
    this.tabs()[next]?.nativeElement.focus();
  }
}
