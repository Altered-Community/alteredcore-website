import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AcStickyOffset } from './sticky-offset';

/** A bar stuck at the top of the page content and a search head stuck below it, as in the editor on phones. */
@Component({
  imports: [AcStickyOffset],
  template: `
    <div class="bar" acStickyOffset style="position: sticky; top: 50px" data-height="56"></div>
    @if (head()) {
      <div class="head" [acStickyOffset]="counts()" style="position: sticky; top: 106px" data-height="56"></div>
    }
  `,
})
class Page {
  readonly head = signal(true);
  readonly counts = signal(true);
}

describe('AcStickyOffset', () => {
  const offset = () => document.documentElement.style.getPropertyValue('--ac-scroll-top-offset');
  let resized: (() => void)[];

  beforeEach(() => {
    resized = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized.push(callback);
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    // jsdom has no layout: an element is as high as its data-height.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { height: Number(this.dataset['height'] ?? 0) } as DOMRect;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render() {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector)!;
    const update = () => {
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };
    return { fixture, el, update };
  }

  it('stops the scroll below the lowest stuck element, less the site header', () => {
    const { fixture } = render();
    expect(offset()).toBe('calc(162px - var(--ac-page-top))');
    fixture.destroy();
    expect(offset()).toBe('');
  });

  it('follows the height of an element that grows (the search head that condenses)', () => {
    const { fixture, el } = render();
    el('.head').dataset['height'] = '88';
    for (const callback of resized) callback();
    expect(offset()).toBe('calc(194px - var(--ac-page-top))');
    fixture.destroy();
  });

  it('leaves out an element that is gone, does not count or does not stick', () => {
    const { fixture, el, update } = render();
    fixture.componentInstance.counts.set(false);
    update();
    expect(offset()).toBe('calc(106px - var(--ac-page-top))');
    fixture.componentInstance.counts.set(true);
    update();
    expect(offset()).toBe('calc(162px - var(--ac-page-top))');

    el('.head').style.position = 'static';
    for (const callback of resized) callback();
    expect(offset()).toBe('calc(106px - var(--ac-page-top))');

    fixture.componentInstance.head.set(false);
    update();
    el('.bar').dataset['height'] = '0';
    for (const callback of resized) callback();
    expect(offset()).toBe('');
    fixture.destroy();
  });

  it('drops the offset while its page is detached (Decks list kept during a deck) and restores it on return', () => {
    const { fixture, update } = render();
    const page = fixture.nativeElement as HTMLElement;
    const parent = page.parentElement!;
    // A render happens on each navigation: the next page's, then the list's when it is attached again.
    page.remove();
    update();
    expect(offset()).toBe('');
    parent.append(page);
    for (const callback of resized) callback();
    update();
    expect(offset()).toBe('calc(162px - var(--ac-page-top))');
    fixture.destroy();
    expect(offset()).toBe('');
  });
});
