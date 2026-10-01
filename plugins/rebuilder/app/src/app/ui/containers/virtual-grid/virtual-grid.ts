import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';

/** Rows `[start, end)` to render: those within `overscan` viewports of the visible part of the grid. */
export function visibleRows(opts: { top: number; viewport: number; rowHeight: number; overscan: number; rowCount: number }): {
  start: number;
  end: number;
} {
  const { top, viewport, rowHeight, overscan, rowCount } = opts;
  const margin = viewport * overscan;
  const start = Math.min(rowCount, Math.max(0, Math.floor((-top - margin) / rowHeight)));
  const end = Math.min(rowCount, Math.max(start, Math.ceil((-top + viewport + margin) / rowHeight)));
  return { start, end };
}

/**
 * CSS grid that keeps only the rows near the viewport in the DOM; the others are replaced by padding
 * of the same height, so the page keeps its full length. The parent renders `slice()` itself, as
 * projected content (`@for (item of grid.slice(); …)`, position `grid.first() + $index`), then its
 * tail (skeletons) when `atEnd()`. The host is the grid: the parent sets its columns and gaps with a
 * class. Cells must all have the height of the first one (card tiles). Scrolls with the window.
 */
@Component({
  selector: 'ar-virtual-grid',
  host: {
    '[style.padding-top.px]': 'padTop()',
    '[style.padding-bottom.px]': 'padBottom()',
  },
  templateUrl: './virtual-grid.html',
  styleUrl: './virtual-grid.scss',
})
export class ArVirtualGrid<T> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly items = input.required<readonly T[]>();
  /** Viewports of rows kept above and below the screen. */
  readonly overscan = input(1.5);
  /** Cells rendered before the grid is measured. */
  readonly initial = input(36);

  private readonly cols = signal(1);
  /** Row height including the row gap; 0 until measured. */
  private readonly rowHeight = signal(0);
  private readonly rows = signal({ start: 0, end: 0 });

  private readonly rowCount = computed(() => Math.ceil(this.items().length / this.cols()));
  /** Index in `items` of the first rendered item. */
  readonly first = computed(() => (this.rowHeight() ? this.rows().start * this.cols() : 0));
  private readonly last = computed(() =>
    this.rowHeight() ? Math.min(this.items().length, this.rows().end * this.cols()) : Math.min(this.items().length, this.initial()),
  );
  /** Items to render. */
  readonly slice = computed(() => this.items().slice(this.first(), this.last()));
  /** The last item is rendered: time for the tail. */
  readonly atEnd = computed(() => this.last() >= this.items().length);
  /** Whole pixels, so the rendered rows stay on the pixel grid; each rounding is under half a pixel, it does not add up. */
  protected readonly padTop = computed(() => Math.round(this.rows().start * this.rowHeight()));
  protected readonly padBottom = computed(() =>
    this.rowHeight() ? Math.round(Math.max(0, this.rowCount() - Math.max(this.rows().start, this.rows().end)) * this.rowHeight()) : 0,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    let frame = 0;
    const schedule = () => (frame ||= requestAnimationFrame(() => this.update(() => (frame = 0))));

    // New pages or a new query: recompute the rows once the list is rendered.
    effect(() => {
      this.items();
      if (typeof requestAnimationFrame !== 'undefined') schedule();
    });

    afterNextRender(() => {
      const el = this.host.nativeElement;
      const resize = new ResizeObserver(() => {
        this.measure();
        schedule();
      });
      // Border box: swapping rows for padding keeps it, so only a new width or new items trigger a measure.
      resize.observe(el, { box: 'border-box' });
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule, { passive: true });
      destroyRef.onDestroy(() => {
        resize.disconnect();
        removeEventListener('scroll', schedule);
        removeEventListener('resize', schedule);
        cancelAnimationFrame(frame);
      });
    });
  }

  /** Columns from the computed grid template, row height from the first cell (fractional, so padding does not drift). */
  private measure(): void {
    const el = this.host.nativeElement;
    const style = getComputedStyle(el);
    this.cols.set(Math.max(1, style.gridTemplateColumns.split(' ').filter(Boolean).length));
    const cell = el.firstElementChild;
    if (cell) this.rowHeight.set(cell.getBoundingClientRect().height + (parseFloat(style.rowGap) || 0));
  }

  private update(done: () => void): void {
    done();
    if (!this.rowHeight()) this.measure();
    const rowHeight = this.rowHeight();
    if (!rowHeight) return;
    const next = visibleRows({
      top: this.host.nativeElement.getBoundingClientRect().top,
      viewport: innerHeight,
      rowHeight,
      overscan: this.overscan(),
      rowCount: this.rowCount(),
    });
    const cur = this.rows();
    if (cur.start !== next.start || cur.end !== next.end) this.rows.set(next);
  }
}
