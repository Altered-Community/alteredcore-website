import { DOCUMENT } from '@angular/common';
import { Service, InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { densityFor, windowSizeFor, type WindowSize } from '../core/breakpoints';

function readWidth(): number {
  return typeof window === 'undefined' ? 1440 : window.innerWidth;
}

function coarse(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
}

/** Logical window size: compact < 768, medium 768–1199, expanded ≥ 1200. */
@Service()
export class ArBreakpointService {
  readonly width = signal(readWidth());
  readonly size = computed<WindowSize>(() => windowSizeFor(this.width()));
  readonly compact = computed(() => this.size() === 'compact');
  readonly expanded = computed(() => this.size() === 'expanded');

  constructor() {
    if (typeof window === 'undefined') return;
    let frame = 0;
    window.addEventListener(
      'resize',
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.width.set(readWidth()));
      },
      { passive: true },
    );
  }

  /** Test hook. */
  setWidth(width: number): void {
    this.width.set(width);
  }
}

/**
 * Element that carries `data-density`: `<html>` by default. In the plugin's shadow root,
 * selectors cannot see `<html>`, so the plugin root carries it instead (`embedConfig`).
 */
export const AR_DENSITY_TARGET = new InjectionToken<HTMLElement>('AR_DENSITY_TARGET');

/** Sets `data-density="pointer|touch"` on <html>; control heights follow via tokens. */
@Service()
export class ArDensityService {
  private readonly breakpoints = inject(ArBreakpointService);
  private readonly doc = inject(DOCUMENT);
  private readonly target = inject(AR_DENSITY_TARGET, { optional: true });
  private readonly coarsePointer = signal(coarse());

  readonly density = computed(() => densityFor(this.breakpoints.width(), this.coarsePointer()));

  constructor() {
    if (typeof matchMedia !== 'undefined') {
      matchMedia('(pointer: coarse)').addEventListener('change', (e) =>
        this.coarsePointer.set(e.matches),
      );
    }
    effect(() => {
      (this.target ?? this.doc.documentElement).setAttribute('data-density', this.density());
    });
  }
}
