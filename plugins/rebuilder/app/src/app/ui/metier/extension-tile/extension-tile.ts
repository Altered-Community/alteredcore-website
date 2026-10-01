import { Component, computed, input, model } from '@angular/core';
import { setImageUrl } from '../../../core/card-art';
import type { SetInfo } from '../../../core/card-filters';

@Component({
  selector: 'ar-extension-tile',
  templateUrl: './extension-tile.html',
  styleUrl: './extension-tile.scss',
})
export class ArExtensionTile {
  readonly extension = input.required<SetInfo>();
  readonly selected = model(false);
  protected readonly logo = computed(() => setImageUrl(this.extension().reference));
}
