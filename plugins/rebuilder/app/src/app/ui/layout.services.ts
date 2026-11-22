import { DOCUMENT } from '@angular/common';
import { Service, computed, inject, signal } from '@angular/core';
import { windowSizeFor, type WindowSize } from '../core/breakpoints';

function readWidth(): number {
  return typeof window === 'undefined' ? 1440 : window.innerWidth;
}

/** Logical window size: compact < 768, medium 768–1199, expanded ≥ 1200. */
@Service()
export class AcBreakpointService {
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
 * Density chosen by the site: the shell sets `data-density="pointer|touch"` on `<html>` (coarse
 * pointer or window < 768 px) and the --ac-* density tokens follow. Read-only mirror for the few
 * components that change layout, not only sizes, with the density.
 */
@Service()
export class AcDensityService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly value = signal(readDensity(this.root));

  readonly density = this.value.asReadonly();

  constructor() {
    if (typeof MutationObserver === 'undefined') return;
    new MutationObserver(() => this.value.set(readDensity(this.root))).observe(this.root, {
      attributes: true,
      attributeFilter: ['data-density'],
    });
  }
}

function readDensity(root: HTMLElement): 'pointer' | 'touch' {
  return root.getAttribute('data-density') === 'touch' ? 'touch' : 'pointer';
}
