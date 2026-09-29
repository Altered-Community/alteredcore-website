import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArVirtualGrid, visibleRows } from './virtual-grid';

describe('visibleRows', () => {
  const base = { viewport: 800, rowHeight: 200, overscan: 1, rowCount: 100 };

  it('keeps the rows on screen plus one viewport on each side', () => {
    // Grid scrolled 4 000 px: rows 20–23 are on screen, 4 rows of margin on each side.
    expect(visibleRows({ ...base, top: -4000 })).toEqual({ start: 16, end: 28 });
  });

  it('starts at the first row while the grid is below the fold', () => {
    expect(visibleRows({ ...base, top: 300 })).toEqual({ start: 0, end: 7 });
  });

  it('never goes past the last row, even after a jump beyond the end', () => {
    expect(visibleRows({ ...base, top: -19_500 })).toEqual({ start: 93, end: 100 });
    expect(visibleRows({ ...base, top: -50_000 })).toEqual({ start: 100, end: 100 });
  });
});

@Component({
  imports: [ArVirtualGrid],
  template: `
    <ar-virtual-grid #grid [items]="items()" [initial]="4">
      @for (n of grid.slice(); track n) {
        <span class="cell" [attr.data-pos]="grid.first() + $index + 1 + '/' + items().length">{{ n }}</span>
      }
      @if (grid.atEnd()) {
        <span class="tail">…</span>
      }
    </ar-virtual-grid>
  `,
})
class Host {
  readonly items = signal(Array.from({ length: 10 }, (_, i) => i * 10));
}

describe('ArVirtualGrid', () => {
  it('renders the first cells with their position in the whole list until it is measured', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const cells = [...fixture.nativeElement.querySelectorAll('.cell')] as HTMLElement[];
    expect(cells.map((c) => c.textContent)).toEqual(['0', '10', '20', '30']);
    expect(cells[3].dataset['pos']).toBe('4/10');
    expect(fixture.nativeElement.querySelector('.tail')).toBeNull();
  });

  it('shows the tail once the last item is rendered', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items.set([1, 2, 3]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.cell').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.tail')).not.toBeNull();
  });
});
