import { Component, computed, input, model, signal } from '@angular/core';
import { AcIcon } from '../../icon';
import type { ComboOption } from '../combobox/combobox';
import { groupStarts, normalizeSearch } from '../option-list';

/**
 * Multi-select list that stays on screen: a search field over one checkbox per option, in the order of
 * `options`. Checking or unchecking leaves every row where it is; Enter in the search field checks the
 * first unchecked match and empties the field, so several values go in from the keyboard in a row.
 * A checked value goes to the end of `values`, the order the user picked them in.
 */
@Component({
  selector: 'ac-check-list',
  imports: [AcIcon],
  templateUrl: './check-list.html',
  styleUrl: './check-list.scss',
})
export class AcCheckList {
  readonly options = input<ComboOption[]>([]);
  readonly values = model<ComboOption[]>([]);
  /** Accessible name of the list (« effet »). */
  readonly label = input.required<string>();
  readonly searchPlaceholder = input($localize`:@@ui.combobox.search:Rechercher…`);

  protected readonly noResults = $localize`:@@ui.combobox.noResults:Aucun résultat`;
  protected readonly noValues = $localize`:@@ui.combobox.noValues:Aucune valeur disponible`;
  protected readonly query = signal('');
  protected readonly checked = computed(() => new Set(this.values().map((v) => v.id)));

  protected readonly filtered = computed(() => {
    const q = normalizeSearch(this.query());
    return q ? this.options().filter((o) => normalizeSearch(o.text).includes(q)) : this.options();
  });

  /** Where a group heading goes: the first listed option of each group. */
  protected readonly groupStarts = computed(() => groupStarts(this.filtered()));

  setChecked(o: ComboOption, on: boolean): void {
    this.values.update((list) => {
      const without = list.filter((v) => v.id !== o.id);
      return on ? [...without, o] : without;
    });
  }

  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = this.filtered().find((o) => !this.checked().has(o.id));
    if (!this.query() || !first) return;
    this.setChecked(first, true);
    this.query.set('');
  }
}
