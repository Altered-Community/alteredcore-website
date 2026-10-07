import { TestBed } from '@angular/core/testing';
import { AcAppBar } from './app-bar';

describe('AcAppBar', () => {
  const offset = () => document.documentElement.style.getPropertyValue('--ac-scroll-top-offset');

  beforeEach(() => {
    // jsdom has no layout: the bar is 56 px high, stuck 50 px from the top (the site header).
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 56 } as DOMRect);
  });

  afterEach(() => vi.restoreAllMocks());

  function create(sticky = true) {
    const fixture = TestBed.createComponent(AcAppBar);
    fixture.componentRef.setInput('sticky', sticky);
    (fixture.nativeElement as HTMLElement).style.top = '50px';
    fixture.detectChanges();
    return fixture;
  }

  it('keeps what the browser scrolls to the top below it while it sticks', () => {
    const fixture = create();
    expect(offset()).toBe('calc(106px - var(--ac-page-top))');
    fixture.destroy();
    expect(offset()).toBe('');
  });

  it('scrolls with the page and leaves the offset alone when it does not stick', () => {
    const fixture = create(false);
    expect((fixture.nativeElement as HTMLElement).style.position).toBe('static');
    expect(offset()).toBe('');
    fixture.componentRef.setInput('sticky', true);
    fixture.detectChanges();
    expect(offset()).toBe('calc(106px - var(--ac-page-top))');
    fixture.destroy();
  });
});
