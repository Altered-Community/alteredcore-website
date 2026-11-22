import { Component, computed, input, model } from '@angular/core';
import { setBackgroundUrl, setImageUrl } from '../../../core/card-art';
import type { SetInfo } from '../../../core/card-filters';

/** A set to filter by: its art behind its mark and name, as the site's search draws it. */
@Component({
  selector: 'ac-extension-tile',
  templateUrl: './extension-tile.html',
  styleUrl: './extension-tile.scss',
})
export class AcExtensionTile {
  readonly extension = input.required<SetInfo>();
  readonly selected = model(false);
  protected readonly logo = computed(() => setImageUrl(this.extension().reference));
  protected readonly background = computed(() => `url('${setBackgroundUrl(this.extension().reference)}')`);
}
