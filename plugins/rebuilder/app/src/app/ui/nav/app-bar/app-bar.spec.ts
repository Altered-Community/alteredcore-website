import { TestBed } from '@angular/core/testing';
import { AcAppBar } from './app-bar';

describe('AcAppBar', () => {
  const offset = () => document.documentElement.style.getPropertyValue('--ac-scroll-top-offset');

  it('keeps what the browser scrolls to the top below it while it sticks', () => {
    const fixture = TestBed.createComponent(AcAppBar);
    fixture.detectChanges();
    expect(offset()).toBe('var(--ac-app-bar-height)');
    fixture.destroy();
    expect(offset()).toBe('');
  });

  it('scrolls with the page and leaves the offset alone when it does not stick', () => {
    const fixture = TestBed.createComponent(AcAppBar);
    fixture.componentRef.setInput('sticky', false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).style.position).toBe('static');
    expect(offset()).toBe('');
    fixture.componentRef.setInput('sticky', true);
    fixture.detectChanges();
    expect(offset()).toBe('var(--ac-app-bar-height)');
    fixture.destroy();
  });

  it('drops the offset while its page is detached (Decks list kept during a deck) and restores it on return', () => {
    const fixture = TestBed.createComponent(AcAppBar);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const parent = el.parentElement as HTMLElement;
    // A render happens on each navigation: the next page's, then the list's when it is attached again.
    const render = () => {
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };
    el.remove();
    render();
    expect(offset()).toBe('');
    parent.append(el);
    render();
    expect(offset()).toBe('var(--ac-app-bar-height)');
    fixture.destroy();
    expect(offset()).toBe('');
  });
});
