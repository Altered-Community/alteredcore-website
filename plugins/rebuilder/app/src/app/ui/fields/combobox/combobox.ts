import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { ArIcon } from '../../icon';
import { nextId } from '../value-accessor';

export interface ComboOption {
  id: number;
  text: string;
  /** `Altered Icons` glyph shown before the text, in the list and on the chip. */
  glyph?: string;
}

/**
 * Multi-select picker (effect editor). The add control is a button: opening it shows the list
 * with a search field that is not focused, so touch keyboards stay closed until the user taps it.
 * Typing on the button moves the key into the search field. Selected values render above as chips.
 */
@Component({
  selector: 'ar-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  host: {
    '(focusout)': 'onFocusOut($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
  templateUrl: './combobox.html',
  styleUrl: './combobox.scss',
})
export class ArCombobox {
  readonly options = input<ComboOption[]>([]);
  readonly values = model<ComboOption[]>([]);
  readonly placeholder = input('Ajouter…');
  readonly emptyPlaceholder = input('');
  readonly searchPlaceholder = input('Rechercher…');
  readonly searchChange = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly listId = nextId('ar-combo');
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(-1);

  protected readonly label = computed(() => (this.values().length ? this.placeholder() : this.emptyPlaceholder() || this.placeholder()));

  protected readonly filtered = computed(() => {
    const q = normalize(this.query());
    const chosen = new Set(this.values().map((v) => v.id));
    const out: ComboOption[] = [];
    for (const o of this.options()) {
      if (chosen.has(o.id)) continue;
      if (q && !normalize(o.text).includes(q)) continue;
      out.push(o);
      if (out.length >= 50) break;
    }
    return out;
  });

  /**
   * Adds `o` and closes the list. After a tap or click nothing keeps the focus, so no control looks
   * selected and the touch keyboard closes; after Enter the focus returns to the button.
   */
  pick(o: ComboOption, fromKeyboard = false): void {
    this.values.update((v) => [...v, o]);
    this.dismiss();
    if (fromKeyboard) this.toggle()?.nativeElement.focus();
    else {
      const focused = this.host.nativeElement.ownerDocument.activeElement as HTMLElement | null;
      if (focused && this.host.nativeElement.contains(focused)) focused.blur();
    }
  }

  remove(o: ComboOption): void {
    this.values.update((v) => v.filter((x) => x.id !== o.id));
  }

  protected toggleOpen(): void {
    if (this.open()) this.dismiss();
    else this.show();
  }

  /** Keys on the closed or open button: arrows / Enter / Space open and move, a letter starts a search. */
  protected onToggleKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this.open()) {
        e.preventDefault();
        this.show(0);
      } else this.move(e.key === 'ArrowDown' ? 1 : -1, e);
    } else if ((e.key === 'Enter' || e.key === ' ') && this.open() && this.active() >= 0) {
      this.pickActive(e);
    } else if (e.key === 'Escape') {
      this.close(e);
    } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.show();
      this.setQuery(this.query() + e.key);
      queueMicrotask(() => this.search()?.nativeElement.focus());
    }
  }

  protected setQuery(q: string): void {
    this.query.set(q);
    this.active.set(q ? 0 : -1);
    this.searchChange.emit(q);
  }

  protected move(delta: number, e: Event): void {
    e.preventDefault();
    this.open.set(true);
    const n = this.filtered().length;
    const i = this.active();
    if (n) this.active.set(i < 0 ? (delta > 0 ? 0 : n - 1) : (i + delta + n) % n);
  }

  protected pickActive(e: Event): void {
    e.preventDefault();
    const o = this.filtered()[this.active()];
    if (o) this.pick(o, true);
  }

  protected close(e: Event): void {
    if (this.open()) {
      e.stopPropagation();
      this.dismiss();
      this.toggle()?.nativeElement.focus();
    }
  }

  /** Keeps focus where it is when the press lands on the panel outside the search field. */
  protected keepFocus(e: Event): void {
    if (e.target !== this.search()?.nativeElement) e.preventDefault();
  }

  protected onFocusOut(e: FocusEvent): void {
    const next = e.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) this.dismiss();
  }

  protected onDocumentPointerDown(e: Event): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.dismiss();
  }

  /** Opens the list; no option is highlighted until an arrow key or a search picks one. */
  private show(active = -1): void {
    this.open.set(true);
    this.active.set(active);
    // Near the bottom of a sheet the list would open under the footer: bring it into view.
    afterNextRender(() => this.host.nativeElement.querySelector('.panel')?.scrollIntoView?.({ block: 'nearest' }), {
      injector: this.injector,
    });
  }

  private dismiss(): void {
    this.open.set(false);
    this.query.set('');
    this.active.set(-1);
  }
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
