import { CdkListbox, CdkOption, type ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { CdkConnectedOverlay, CdkOverlayOrigin, createRepositionScrollStrategy, type ConnectedPosition } from '@angular/cdk/overlay';
import { _getEventTarget } from '@angular/cdk/platform';
import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, booleanAttribute, Injector, afterNextRender, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { AcIcon } from '../../icon';
import { groupStarts, normalizeSearch } from '../option-list';
import { nextId } from '../value-accessor';

export interface ComboOption {
  id: number;
  text: string;
  /** `Altered Icons` glyph shown before the text, in the list and on the chip. */
  glyph?: string;
  /** Thumbnail in the list (a card image). */
  thumb?: string;
  /** Heading of the list: consecutive options of the same group sit under it. */
  group?: string;
}

/** Below the button, above it when there is no room. */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/**
 * Multi-select picker (effect editor): selected values as chips, then a button that opens the list.
 * The list is a CDK connected overlay (outside press, keyboard events, position, scroll) holding a search
 * field and a CDK listbox (arrows, Home / End, Enter, typeahead, ARIA). Opening does not focus the
 * search field, so touch keyboards stay closed until the user taps it; typing on the button moves
 * the key into it.
 *
 * `keepOpen`: several values in a row (calculators, subtypes). Each option has a check box, a press checks or
 * unchecks it and the list stays open; Enter in the search field checks the first unchecked match and
 * empties the field. The chips go under the button, so checking never moves the button or the list.
 */
@Component({
  selector: 'ac-combobox',
  imports: [AcIcon, NgTemplateOutlet, CdkOverlayOrigin, CdkConnectedOverlay, CdkListbox, CdkOption],
  templateUrl: './combobox.html',
  styleUrl: './combobox.scss',
})
export class AcCombobox {
  private readonly injector = inject(Injector);
  readonly options = input<ComboOption[]>([]);
  readonly values = model<ComboOption[]>([]);
  readonly placeholder = input($localize`:@@ui.combobox.add:Ajouter…`);
  readonly searchPlaceholder = input($localize`:@@ui.combobox.search:Rechercher…`);
  /** Check several values without the list closing; checked values stay in the list. */
  readonly keepOpen = input(false, { transform: booleanAttribute });
  readonly searchChange = output<string>();

  private readonly toggle = viewChild.required<ElementRef<HTMLButtonElement>>('toggle');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly listbox = viewChild(CdkListbox);

  protected readonly positions = POSITIONS;
  /** Picked options leave the list, so the listbox itself never keeps a selection. */
  protected readonly noSelection: readonly ComboOption[] = [];
  protected readonly scrollStrategy = createRepositionScrollStrategy(this.injector);
  protected readonly listId = nextId('ac-combo');
  protected removeLabel(v: ComboOption): string {
    return $localize`:@@ui.combobox.remove:Retirer ${v.text}:value:`;
  }
  protected readonly noResults = $localize`:@@ui.combobox.noResults:Aucun résultat`;
  protected readonly noValues = $localize`:@@ui.combobox.noValues:Aucune valeur disponible`;
  protected readonly query = signal('');
  protected readonly open = signal(false);

  /**
   * Selection of the listbox: with `keepOpen`, the checked options among those listed (the listbox
   * rejects a value it has no option for, such as one the search hides); none otherwise.
   */
  protected readonly listValue = computed(() => {
    if (!this.keepOpen()) return this.noSelection;
    const checked = new Set(this.values().map((v) => v.id));
    return this.filtered().filter((o) => checked.has(o.id));
  });

  /** Where a group heading goes: the first listed option of each group. */
  protected readonly groupStarts = computed(() => groupStarts(this.filtered()));

  protected readonly filtered = computed(() => {
    const q = normalizeSearch(this.query());
    const chosen = this.keepOpen() ? new Set<number>() : new Set(this.values().map((v) => v.id));
    const out: ComboOption[] = [];
    for (const o of this.options()) {
      if (chosen.has(o.id)) continue;
      if (q && !normalizeSearch(o.text).includes(q)) continue;
      out.push(o);
      if (out.length >= 50) break;
    }
    return out;
  });

  /** Adds `o`, closes the list and gives the focus back to the button. */
  pick(o: ComboOption): void {
    this.values.update((v) => [...v, o]);
    this.close();
  }

  /** `keepOpen`: a checked value goes to the end of `values`, the order the user picked them in. */
  setChecked(o: ComboOption, on: boolean): void {
    this.values.update((list) => {
      const without = list.filter((v) => v.id !== o.id);
      return on ? [...without, o] : without;
    });
  }

  remove(o: ComboOption): void {
    this.values.update((v) => v.filter((x) => x.id !== o.id));
  }

  protected onSelect(e: ListboxValueChangeEvent<ComboOption>): void {
    if (this.keepOpen()) {
      if (e.option) this.setChecked(e.option.value, e.option.isSelected());
      return;
    }
    const o = e.value[0];
    if (o) this.pick(o);
  }

  protected toggleOpen(): void {
    if (this.open()) this.close();
    else this.open.set(true);
  }

  /** On the button: arrows open the list and move into it, a letter starts a search. */
  protected onToggleKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.open.set(true);
      this.focusList();
    } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.open.set(true);
      this.setQuery(this.query() + e.key);
      afterNextRender(() => this.search()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  /** In the search field: arrows go to the list, Enter picks (checks, with `keepOpen`) the first match. */
  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!this.query()) return;
      if (this.keepOpen()) {
        const checked = new Set(this.values().map((v) => v.id));
        const first = this.filtered().find((o) => !checked.has(o.id));
        if (first) this.setChecked(first, true);
        this.query.set('');
        return;
      }
      const first = this.filtered()[0];
      if (first) this.pick(first);
    }
  }

  protected setQuery(q: string): void {
    this.query.set(q);
    this.searchChange.emit(q);
  }

  /** A press outside the list closes it; on the button, the button's own click does. */
  protected onOutsideClick(e: MouseEvent): void {
    if (!this.toggle().nativeElement.contains(_getEventTarget(e) as Node | null)) this.dismiss();
  }

  /** Tab out of the button or of the list, to anything else, closes it. */
  protected onFocusOut(e: FocusEvent): void {
    const next = e.relatedTarget as Node | null;
    const panel = this.search()?.nativeElement.closest('.panel');
    if (next && !this.toggle().nativeElement.contains(next) && !panel?.contains(next)) this.dismiss();
  }

  /** Escape anywhere in the list, or on the button while it is open. */
  protected onOverlayKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  /** The overlay went away on its own (navigation): keep the state in step. */
  protected onDetach(): void {
    if (this.open()) this.dismiss();
  }

  /** After Escape or a pick: back to the button. */
  protected close(): void {
    this.dismiss();
    this.toggle().nativeElement.focus();
  }

  /** The listbox puts the focus on its first option; its key manager takes the arrows from there. */
  private focusList(): void {
    afterNextRender(() => this.listbox()?.focus(), { injector: this.injector });
  }

  private dismiss(): void {
    this.open.set(false);
    this.query.set('');
  }
}
