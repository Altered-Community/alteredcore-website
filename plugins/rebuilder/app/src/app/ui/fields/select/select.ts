import { NgTemplateOutlet } from '@angular/common';
import { CdkConnectedOverlay, CdkOverlayOrigin, createRepositionScrollStrategy, type ConnectedPosition } from '@angular/cdk/overlay';
import { _getEventTarget } from '@angular/cdk/platform';
import { Component, ElementRef, Injector, afterNextRender, computed, forwardRef, inject, input, model, signal, viewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AcIcon } from '../../icon';
import { nextId, ValueAccessor } from '../value-accessor';

export interface AcOption<T = string> {
  value: T;
  label: string;
  /** Group label; consecutive options of the same group are listed under it. */
  group?: string;
  /** Colour dot before the label (any CSS colour, usually `var(--ac-faction-<id>)`). */
  color?: string;
  disabled?: boolean;
}

interface Row {
  option: AcOption;
  /** Index in the flat list of shown options (keyboard navigation, ids). */
  index: number;
}
interface Group {
  label: string;
  /** Shown on the header when every option of the group has this colour. */
  color: string;
  rows: Row[];
}

/** Below the field, above it when there is no room. */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
];
const SEARCH_FROM = 8;

/**
 * Select drawn by the design system: `ac-listbox` (design-system/css/components/listbox.css,
 * docs/components/listbox.md). The list is a CDK connected overlay with a search field from 8
 * options, groups with sticky headers and colour dots. Focus stays on the button (or the search
 * field) and `aria-activedescendant` points at the active option, as on the PHP pages (js/ac.js).
 */
@Component({
  selector: 'ac-select',
  host: { class: 'ac-field' },
  imports: [AcIcon, CdkOverlayOrigin, CdkConnectedOverlay, NgTemplateOutlet],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AcSelect), multi: true }],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class AcSelect extends ValueAccessor<string> {
  private readonly injector = inject(Injector);
  readonly value = model('');
  readonly options = input<AcOption[]>([]);
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly inlineLabel = input(false);
  /** Search field: `'auto'` shows it from 8 options. */
  readonly searchable = input<'auto' | boolean>('auto');
  readonly searchPlaceholder = input($localize`:@@ui.select.search:Rechercher…`);
  readonly disabled = input(false);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly id = nextId('ac-select');
  protected readonly labelId = `${this.id}-label`;
  protected readonly valueId = `${this.id}-value`;
  protected readonly listId = `${this.id}-list`;
  protected readonly positions = POSITIONS;
  protected readonly scrollStrategy = createRepositionScrollStrategy(this.injector);
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly active = signal(-1);
  /** Width of the field when the list opens: the panel is at least as wide. */
  protected readonly panelMinWidth = signal(0);
  private typed = '';
  private typedAt = 0;

  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()) ?? null);
  protected readonly withSearch = computed(() => {
    const s = this.searchable();
    return s === 'auto' ? this.options().length >= SEARCH_FROM : s;
  });
  protected readonly triggerName = computed(() => (this.label() ? null : `${this.ariaLabel()}, ${this.selected()?.label ?? ''}`));

  /** Options without a group first, then the groups, filtered by the search (names, then group names). */
  protected readonly view = computed(() => {
    const q = fold(this.query().trim());
    const match = (o: AcOption) => !q || fold(o.label).includes(q) || (!!o.group && fold(o.group).startsWith(q));
    const loose: Row[] = [];
    const groups: Group[] = [];
    let index = 0;
    for (const o of this.options()) {
      if (!match(o)) continue;
      const row = { option: o, index: index++ };
      const last = groups.at(-1);
      if (!o.group) {
        if (groups.length) groups.push({ label: '', color: '', rows: [row] });
        else loose.push(row);
      } else if (last && last.label === o.group) {
        last.rows.push(row);
        if (last.color !== o.color) last.color = '';
      } else {
        groups.push({ label: o.group, color: o.color ?? '', rows: [row] });
      }
    }
    const rows = [...loose, ...groups.flatMap((g) => g.rows)].sort((a, b) => a.index - b.index);
    return { loose, groups, rows };
  });
  protected readonly activeId = computed(() => (this.open() && this.active() >= 0 ? this.optionId(this.active()) : null));

  protected optionId(i: number): string {
    return `${this.id}-o${i}`;
  }
  protected groupId(i: number): string {
    return `${this.id}-g${i}`;
  }
  protected highlight(label: string): { before: string; match: string; after: string } {
    const q = fold(this.query().trim());
    const i = q ? fold(label).indexOf(q) : -1;
    return i < 0 ? { before: label, match: '', after: '' } : { before: label.slice(0, i), match: label.slice(i, i + q.length), after: label.slice(i + q.length) };
  }
  protected readonly noResults = computed(() => $localize`:@@ui.select.noResults:Aucun résultat pour « ${this.query().trim()}:query: »`);
  protected readonly noOptions = $localize`:@@ui.select.noOptions:Aucune option`;

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  protected focusTrigger(): void {
    this.trigger().nativeElement.focus();
  }

  protected toggle(): void {
    if (this.open()) this.dismiss();
    else this.show();
  }

  private show(): void {
    if (this.isDisabled()) return;
    this.query.set('');
    this.panelMinWidth.set(this.trigger().nativeElement.getBoundingClientRect().width);
    this.open.set(true);
    const rows = this.view().rows;
    const current = rows.findIndex((r) => r.option.value === this.value() && !r.option.disabled);
    if (current >= 0) this.active.set(current);
    else this.move(1, -1);
    // The search field is not focused: no touch keyboard until the user taps it or types.
    afterNextRender(() => this.scrollToActive(), { injector: this.injector });
  }

  protected pick(row: Row): void {
    if (row.option.disabled) return;
    if (row.option.value !== this.value()) this.emit(row.option.value);
    this.onTouched();
    this.close();
  }

  protected setQuery(q: string): void {
    this.query.set(q);
    this.active.set(-1);
    this.move(1, -1);
  }

  protected hover(row: Row): void {
    if (!row.option.disabled && row.index !== this.active()) this.active.set(row.index);
  }

  /** On the button. Closed: arrows, Enter, Space open; a letter opens and types in the search field (or jumps). */
  protected onTriggerKey(e: KeyboardEvent): void {
    if (!this.open()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        this.show();
      } else if (printable(e)) {
        this.show();
        this.typeInto(e);
      }
      return;
    }
    if (this.handleOpenKey(e)) return;
    if (e.key === 'Home') {
      e.preventDefault();
      this.move(1, -1);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.move(-1, 0);
    } else if (e.key === ' ') {
      e.preventDefault();
      this.pickActive();
    } else if (printable(e)) this.typeInto(e);
  }

  /** A letter on the button: into the search field when there is one, else jump to the next matching option. */
  private typeInto(e: KeyboardEvent): void {
    if (!this.withSearch()) {
      this.typeahead(e.key);
      return;
    }
    e.preventDefault();
    this.setQuery(this.query() + e.key);
    afterNextRender(() => this.search()?.nativeElement.focus(), { injector: this.injector });
  }

  /** In the search field. Returns nothing: Angular cancels the key when a template handler returns false. */
  protected onSearchKey(e: KeyboardEvent): void {
    this.handleOpenKey(e);
  }

  /** Escape wherever the focus is while the list is open (the button and the search field handle their own keys). */
  protected onOverlayKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  /** Keys shared by the button and the search field while the list is open; true when handled. */
  private handleOpenKey(e: KeyboardEvent): boolean {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.move(1);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this.move(-1);
        return true;
      case 'Enter':
        e.preventDefault();
        this.pickActive();
        return true;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return true;
      case 'Tab':
        this.dismiss();
        return false;
      default:
        return false;
    }
  }

  /** A press outside the list closes it; on the button, the button's own click does. */
  protected onOutsideClick(e: MouseEvent): void {
    if (!this.trigger().nativeElement.contains(_getEventTarget(e) as Node | null)) this.dismiss();
  }

  /** Focus leaving both the button and the panel closes the list. */
  protected onFocusOut(e: FocusEvent): void {
    const next = e.relatedTarget as Node | null;
    const panel = this.list()?.nativeElement.closest('.ac-listbox__panel');
    if (next && !this.trigger().nativeElement.contains(next) && !panel?.contains(next)) this.dismiss();
  }

  /** The overlay went away on its own (navigation): keep the state in step. */
  protected onDetach(): void {
    if (this.open()) this.dismiss();
  }

  private pickActive(): void {
    const row = this.view().rows[this.active()];
    if (row) this.pick(row);
  }

  /** Next enabled option after `from` (default: the active one) in direction `step`, wrapping. */
  private move(step: 1 | -1, from = this.active()): void {
    const rows = this.view().rows;
    const n = rows.length;
    let i = from;
    for (let k = 0; k < n; k++) {
      i = (i + step + n) % n;
      if (!rows[i].option.disabled) {
        this.active.set(i);
        break;
      }
    }
    afterNextRender(() => this.scrollToActive(), { injector: this.injector });
  }

  private typeahead(ch: string): void {
    const now = Date.now();
    this.typed = (now - this.typedAt > 700 ? '' : this.typed) + fold(ch);
    this.typedAt = now;
    const rows = this.view().rows;
    const start = this.typed.length === 1 ? this.active() + 1 : Math.max(this.active(), 0);
    for (let k = 0; k < rows.length; k++) {
      const i = (start + k) % rows.length;
      if (!rows[i].option.disabled && fold(rows[i].option.label).startsWith(this.typed)) {
        this.active.set(i);
        afterNextRender(() => this.scrollToActive(), { injector: this.injector });
        return;
      }
    }
  }

  private scrollToActive(): void {
    const id = this.activeId();
    const el = id ? this.list()?.nativeElement.querySelector(`[id="${id}"]`) : null;
    el?.scrollIntoView({ block: 'nearest' });
  }

  /** After Escape or a pick: back to the button. */
  private close(): void {
    this.dismiss();
    this.focusTrigger();
  }

  private dismiss(): void {
    this.open.set(false);
    this.query.set('');
  }
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function printable(e: KeyboardEvent): boolean {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}
