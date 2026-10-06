import { Component, input, output, signal } from '@angular/core';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { AcIcon, type AcIconName } from '../../icon';

/** An entry of the arrow's menu. */
export interface AcSplitButtonItem {
  id: string;
  icon: AcIconName;
  label: string;
  /** Second line, muted. */
  hint?: string;
  /** Pill at the end (« Par défaut »: the entry that does what the button does). */
  badge?: string;
}

/** Below the button, right edges aligned; above when there is no room below. */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
];

/**
 * Split button (secondary look): the main part does the usual action (`press`), the arrow opens a menu of the others
 * (`pick`, the item's id). The label is the content. The menu is a CDK menu (arrows, Échap, focus back to the arrow),
 * at least as wide as the whole button.
 */
@Component({
  selector: 'ac-split-button',
  imports: [AcIcon, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  host: { '[class.sm]': "size() === 'sm'" },
  templateUrl: './split-button.html',
  styleUrl: './split-button.scss',
})
export class AcSplitButton {
  readonly icon = input<AcIconName | undefined>(undefined);
  /** Working: a spinner instead of the icon, both parts disabled (the label is the caller's, e.g. « Génération… »). */
  readonly busy = input(false);
  /** `sm`: the height and type of the small buttons (deck bar actions). */
  readonly size = input<'md' | 'sm'>('md');
  readonly items = input.required<AcSplitButtonItem[]>();
  /** The arrow's aria-label. */
  readonly moreLabel = input.required<string>();
  /** The menu's aria-label. */
  readonly menuLabel = input.required<string>();
  readonly press = output<void>();
  readonly pick = output<string>();

  /** The whole button's width: the menu's minimum. */
  protected readonly width = signal(0);
  protected readonly positions = POSITIONS;

  protected opened(split: HTMLElement): void {
    this.width.set(split.offsetWidth);
  }
}
