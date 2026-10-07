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
    expect((fixture.nativeElement as HTMLElement).classList).toContain('static');
    expect(offset()).toBe('');
    fixture.componentRef.setInput('sticky', true);
    fixture.detectChanges();
    expect(offset()).toBe('var(--ac-app-bar-height)');
    fixture.destroy();
  });

  it('keeps the offset while the next page bar is mounted before the previous one is destroyed', () => {
    const previous = TestBed.createComponent(AcAppBar);
    previous.detectChanges();
    const next = TestBed.createComponent(AcAppBar);
    next.detectChanges();
    previous.destroy();
    expect(offset()).toBe('var(--ac-app-bar-height)');
    next.destroy();
    expect(offset()).toBe('');
  });
});
