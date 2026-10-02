import { signal } from '@angular/core';
import { AcDrawerState } from './drawer';

describe('AcDrawerState', () => {
  const animationEnd = (target: EventTarget) => ({ target, currentTarget: target }) as unknown as AnimationEvent;

  it('does not animate before the user toggles the panel', () => {
    const drawer = new AcDrawerState(signal(true), 'start');
    expect(drawer.enter()).toBeNull();
  });

  it('plays the leave motion first, then flips the panel', () => {
    const open = signal(true);
    const changed: boolean[] = [];
    const drawer = new AcDrawerState(open, 'end', (o) => changed.push(o));
    drawer.set(false);
    expect(drawer.leaving()).toBe(true);
    expect(open()).toBe(true);
    const el = {} as EventTarget;
    drawer.left(animationEnd(el));
    expect(drawer.leaving()).toBe(false);
    expect(open()).toBe(false);
    expect(changed).toEqual([false]);
    expect(drawer.enter()).toBe('ac-drawer-enter--end');
  });

  it('ignores the animations of the content and a second toggle while leaving', () => {
    const open = signal(true);
    const drawer = new AcDrawerState(open, 'start');
    drawer.set(false);
    drawer.set(true);
    drawer.left({ target: {}, currentTarget: {} } as unknown as AnimationEvent);
    expect(drawer.leaving()).toBe(true);
    expect(open()).toBe(true);
  });

  it('flips the panel without an animationend after a while', () => {
    vi.useFakeTimers();
    const open = signal(true);
    const drawer = new AcDrawerState(open, 'start');
    drawer.set(false);
    vi.advanceTimersByTime(500);
    expect(open()).toBe(false);
    vi.useRealTimers();
  });
});
