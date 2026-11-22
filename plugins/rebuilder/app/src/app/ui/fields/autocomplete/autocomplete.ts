import { CdkConnectedOverlay, CdkOverlayOrigin, createRepositionScrollStrategy, type ConnectedPosition } from '@angular/cdk/overlay';
import { _getEventTarget } from '@angular/cdk/platform';
import { Component, ElementRef, Injector, computed, effect, inject, input, model, output, signal, viewChild } from '@angular/core';
import { AcIcon } from '../../icon';
import { normalizeSearch } from '../option-list';
import { nextId } from '../value-accessor';

/** A suggestion of `ac-autocomplete`. */
export interface AcSuggestion {
  value: string;
  label: string;
  /** Muted detail after the label (rarity, set). */
  meta?: string;
  /** Thumbnail before the label (a card image). */
  thumb?: string;
  /** Colour dot before the label (any CSS colour, usually `var(--ac-faction-<id>)`). */
  color?: string;
}

/** Below the field, above it when there is no room. */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
];

/**
 * Text field with suggestions as you type (`ac-input` + `ac-listbox__panel--suggestions`, design-system
 * `listbox.md` § Suggestions). The page fetches the suggestions for `queryChange` and passes them in `options`; picking
 * one sets `selected`, shown in the field with a clear button. Typing again drops the selection. Focus stays in the
 * field: arrows move the active option (`aria-activedescendant`), Enter picks it (the first one when none is active),
 * Escape closes the list. The list opens from `minChars` characters.
 */
@Component({
  selector: 'ac-autocomplete',
  host: { class: 'ac-field' },
  imports: [AcIcon, CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.scss',
})
export class AcAutocomplete {
  private readonly injector = inject(Injector);
  readonly options = input<AcSuggestion[]>([]);
  readonly selected = model<AcSuggestion | null>(null);
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly placeholder = input('');
  /** Suggestions on their way: « Recherche… » in the list instead of « Aucun résultat ». */
  readonly loading = input(false);
  readonly minChars = input(2);
  readonly queryChange = output<string>();

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly id = nextId('ac-autocomplete');
  protected readonly listId = `${this.id}-list`;
  protected readonly positions = POSITIONS;
  protected readonly scrollStrategy = createRepositionScrollStrategy(this.injector);
  protected readonly query = signal('');
  protected readonly focused = signal(false);
  protected readonly dismissed = signal(false);
  protected readonly active = signal(-1);
  protected readonly noResults = $localize`:@@ui.autocomplete.noResults:Aucun résultat`;
  protected readonly searching = $localize`:@@ui.autocomplete.loading:Recherche…`;
  protected readonly clearLabel = $localize`:@@ui.input.clear:Effacer`;

  /** What the field shows: the picked suggestion, or the text typed. */
  protected readonly text = computed(() => this.selected()?.label ?? this.query());
  protected readonly open = computed(
    () => this.focused() && !this.dismissed() && !this.selected() && this.query().trim().length >= this.minChars(),
  );
  protected readonly activeId = computed(() => (this.open() && this.active() >= 0 ? this.optionId(this.active()) : null));

  constructor() {
    // New suggestions: none active until the arrows move.
    effect(() => {
      this.options();
      this.active.set(-1);
    });
    // The active option stays visible while the arrows move (ids are generated: no escaping needed).
    effect(() => {
      const id = this.activeId();
      if (id) this.list()?.nativeElement.querySelector(`#${id}`)?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  protected optionId(i: number): string {
    return `${this.id}-o${i}`;
  }

  /** The part of `label` that matches the text typed, for `<mark>`. */
  protected highlight(label: string): { before: string; match: string; after: string } {
    const q = normalizeSearch(this.query().trim());
    const at = q ? normalizeSearch(label).indexOf(q) : -1;
    if (at < 0) return { before: label, match: '', after: '' };
    return { before: label.slice(0, at), match: label.slice(at, at + q.length), after: label.slice(at + q.length) };
  }

  protected onInput(value: string): void {
    if (this.selected()) this.selected.set(null);
    this.query.set(value);
    this.dismissed.set(false);
    this.queryChange.emit(value);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.options().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this.open() && !this.selected()) this.dismissed.set(false);
      if (!n) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      this.active.update((i) => (i < 0 ? (step > 0 ? 0 : n - 1) : (i + step + n) % n));
    } else if (e.key === 'Enter') {
      if (!this.open()) return;
      e.preventDefault();
      const o = this.options()[Math.max(0, this.active())];
      if (o && !this.loading()) this.pick(o);
    } else if (e.key === 'Escape' && this.open()) {
      e.preventDefault();
      this.dismissed.set(true);
    }
  }

  pick(o: AcSuggestion): void {
    this.selected.set(o);
    this.query.set('');
    this.dismissed.set(true);
  }

  clear(): void {
    this.selected.set(null);
    this.query.set('');
    this.queryChange.emit('');
    this.field().nativeElement.focus();
  }

  protected onFocus(): void {
    this.focused.set(true);
    this.dismissed.set(false);
  }

  /** Focus leaving the field closes the list (a press on an option keeps it: see `pointerdown` in the template). */
  protected onBlur(): void {
    this.focused.set(false);
  }

  protected onOutsideClick(e: MouseEvent): void {
    if (!this.field().nativeElement.contains(_getEventTarget(e) as Node | null)) this.dismissed.set(true);
  }

  protected hover(i: number): void {
    this.active.set(i);
  }
}
