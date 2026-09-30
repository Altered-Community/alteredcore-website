import { Dialog, DIALOG_DATA } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Service, InjectionToken, Injector, inject, signal, type Type } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subject, filter, type Observable } from 'rxjs';
import { ArBreakpointService } from '../layout.services';
import { ArOverlayContainer } from './overlay-container/overlay-container';

export interface ArOverlayConfig<D = unknown> {
  title: string;
  subtitle?: string;
  data?: D;
  /** Centered window width at ≥ 768 px. */
  width?: number;
  /** Window height at ≥ 768 px: fit content (default, max 90vh / 900 px) or fill the viewport minus 40 px margins. */
  height?: 'auto' | 'fill';
  /** Compact presentation: bottom sheet (default), left drawer, or full screen page. */
  compact?: 'sheet' | 'drawer' | 'fullscreen';
  /** Leading control in compact full-screen / nested views. */
  leading?: 'close' | 'back';
  /** Sheet height: fit content (default) or full (top at 48 px). */
  sheetHeight?: 'auto' | 'full';
  ariaLabel?: string;
  /** No window: the content alone over the backdrop, centered at every width (the title is read by screen readers only). */
  bare?: boolean;
}

/** A step shown in place of the current content, in the same window / sheet (no stacked overlay). */
export interface ArStepConfig<D = unknown> {
  title: string;
  subtitle?: string;
  data?: D;
}

/** One view of an overlay window: the root content, then any steps opened on top of it. */
export interface ArOverlayView {
  component: Type<unknown>;
  ref: ArOverlayRef;
  injector: Injector;
}

export interface ArHeaderAction {
  label: string;
  run: () => void;
}

/** Handle given to overlay content (inject `ArOverlayRef`). */
export class ArOverlayRef<R = unknown, D = unknown> {
  readonly title = signal('');
  readonly subtitle = signal('');
  /** Line under the title (e.g. « Le héros détermine votre faction… »). */
  readonly description = signal('');
  readonly headerAction = signal<ArHeaderAction | null>(null);
  readonly leading = signal<'close' | 'back'>('close');
  /** When set, the leading back arrow calls this instead of closing. */
  readonly back = signal<(() => void) | null>(null);
  /**
   * Asked before the user closes the window (cross, Escape, backdrop, browser Back); `false` keeps it
   * open. Programmatic `close()` ignores it.
   */
  readonly closeGuard = signal<(() => boolean) | null>(null);
  private readonly closed$ = new Subject<R | undefined>();
  readonly afterClosed: Observable<R | undefined> = this.closed$.asObservable();
  dialogRef?: { close(result?: unknown): void };
  /** Root window only: its views, the last one being displayed. */
  readonly views = signal<ArOverlayView[]>([]);
  /** Set on steps: the window they are shown in. */
  root: ArOverlayRef | null = null;
  /** Internal: provided by ArOverlayService on the root. */
  stepOpener?: (component: Type<unknown>, config: ArStepConfig<unknown>) => ArOverlayRef;

  constructor(readonly data: D) {}

  /** True for a step opened with `openStep()`. */
  get isStep(): boolean {
    return !!this.root;
  }

  /**
   * Replaces the content with `component` in the same window; the leading back arrow (or `close()` from the
   * step) returns to the previous view, which keeps its state. The step result arrives on its `afterClosed`.
   */
  openStep<C, R = unknown, SD = unknown>(component: Type<C>, config: ArStepConfig<SD>): ArOverlayRef<R, SD> {
    const root = this.root ?? this;
    return root.stepOpener!(component, config as ArStepConfig<unknown>) as ArOverlayRef<R, SD>;
  }

  close(result?: R): void {
    this.dialogRef?.close(result);
  }

  /** Close asked by the user: goes through `closeGuard`. Returns whether the window closes. */
  dismiss(): boolean {
    const guard = this.closeGuard();
    if (guard && !guard()) return false;
    this.close();
    return true;
  }

  /** Internal: called once by the service. */
  notifyClosed(result: R | undefined): void {
    this.closed$.next(result);
    this.closed$.complete();
  }
}

export const AR_OVERLAY_CONTENT = new InjectionToken<{ ref: ArOverlayRef; mode: string; fill?: boolean; bare?: boolean; titleId: string }>(
  'AR_OVERLAY_CONTENT',
);

/**
 * Responsive overlay: CDK Dialog as a centered window (≥ 768 px) or, below that, a bottom sheet,
 * a left drawer, or a full screen page. The same content component is used in every presentation.
 */
@Service()
export class ArOverlayService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpoints = inject(ArBreakpointService);
  private readonly stack: ArOverlayRef[] = [];
  /** Resolves a programmatic close once the history entry pushed on open has been popped. */
  private pendingBack: (() => void) | null = null;
  /**
   * Set just before a `replaceUrl` navigation. The overlay entry is reused by that navigation,
   * so closing must not `history.back()` — that pop would cancel the route change.
   */
  private yieldHistory = false;

  constructor() {
    const router = inject(Router);
    router.events.pipe(filter((e): e is NavigationStart => e instanceof NavigationStart)).subscribe((e) => {
      const path = (url: string) => url.split(/[?#]/)[0];
      if (path(e.url) !== path(router.url)) this.closeAll();
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        if (this.pendingBack) {
          const done = this.pendingBack;
          this.pendingBack = null;
          // The router handles popstate in a macrotask; resolve after it so follow-up navigations win.
          setTimeout(done, 0);
          return;
        }
        const top = this.stack[this.stack.length - 1];
        if (!top || history.state?.arOverlay === this.stack.length) return;
        // Kept open by its guard: put back the history entry the Back button popped.
        if (!top.dismiss()) history.pushState({ ...(history.state ?? {}), arOverlay: this.stack.length }, '');
      });
    }
  }

  get openCount(): number {
    return this.stack.length;
  }

  /**
   * The next close keeps the current history entry. Call it immediately before
   * `navigateByUrl(..., { replaceUrl: true })` so the navigation replaces the overlay
   * entry instead of racing a `history.back()`.
   */
  yieldHistoryToNavigation(): void {
    this.yieldHistory = true;
  }

  isOpen(ref: ArOverlayRef): boolean {
    return this.stack.includes(ref);
  }

  open<C, R = unknown, D = unknown>(component: Type<C>, config: ArOverlayConfig<D>): ArOverlayRef<R, D> {
    const compact = this.breakpoints.compact();
    const bare = !!config.bare;
    const mode = compact && !bare ? (config.compact ?? 'sheet') : 'dialog';
    const fill = mode === 'dialog' && config.height === 'fill';
    const ref = new ArOverlayRef<R, D>(config.data as D);
    ref.title.set(config.title);
    ref.subtitle.set(config.subtitle ?? '');
    ref.leading.set(config.leading ?? 'close');

    const titleId = `ar-ov-${Math.random().toString(36).slice(2, 8)}`;
    const injector = Injector.create({
      providers: [
        { provide: ArOverlayRef, useValue: ref },
        { provide: AR_OVERLAY_CONTENT, useValue: { ref, mode, fill, bare, titleId } },
      ],
    });
    ref.views.set([{ component, ref: ref as ArOverlayRef, injector }]);

    const position =
      mode === 'dialog'
        ? this.overlay.position().global().centerHorizontally().centerVertically()
        : mode === 'sheet'
          ? this.overlay.position().global().bottom('0').centerHorizontally()
          : this.overlay.position().global().top('0').left('0');

    const dialogRef = this.dialog.open(ArOverlayContainer, {
      injector,
      width:
        mode === 'dialog'
          ? `min(${config.width ?? 520}px, calc(100vw - 32px))`
          : mode === 'drawer'
            ? 'min(var(--ar-drawer-width), calc(100vw - var(--ar-space-10)))'
            : '100vw',
      maxWidth: mode === 'drawer' ? 'min(var(--ar-drawer-width), calc(100vw - var(--ar-space-10)))' : '100vw',
      height:
        mode === 'fullscreen' || mode === 'drawer'
          ? '100dvh'
          : mode === 'sheet' && config.sheetHeight === 'full'
            ? 'calc(100dvh - 48px)'
            : undefined,
      positionStrategy: position,
      panelClass: ['ar-overlay-pane', `ar-overlay-pane--${mode}`, ...(fill ? ['ar-overlay-pane--fill'] : []), ...(bare ? ['ar-overlay-pane--bare'] : [])],
      backdropClass: 'ar-overlay-backdrop',
      hasBackdrop: true,
      // Accessible name follows the visible title, which changes with steps.
      ariaLabel: config.ariaLabel,
      ariaLabelledBy: config.ariaLabel ? null : titleId,
      autoFocus: 'dialog',
      restoreFocus: true,
      closeOnNavigation: false,
      // Escape and the backdrop are handled below so that Escape leaves a step first.
      disableClose: true,
    });
    ref.dialogRef = dialogRef;
    ref.stepOpener = (c, cfg) => this.openStep(ref as ArOverlayRef, c, cfg, () => dialogRef.componentInstance);
    dialogRef.backdropClick.subscribe(() => ref.dismiss());
    dialogRef.keydownEvents.subscribe((e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      ref.views().at(-1)!.ref.dismiss();
    });
    this.register(ref as ArOverlayRef);

    dialogRef.closed.subscribe((result) => {
      this.release(ref as ArOverlayRef, () => ref.notifyClosed(result as R | undefined));
    });
    return ref;
  }

  private openStep(
    root: ArOverlayRef,
    component: Type<unknown>,
    config: ArStepConfig<unknown>,
    container: () => ArOverlayContainer | null,
  ): ArOverlayRef {
    const step = new ArOverlayRef(config.data);
    step.root = root;
    step.title.set(config.title);
    step.subtitle.set(config.subtitle ?? '');
    step.leading.set('back');
    const injector = Injector.create({ providers: [{ provide: ArOverlayRef, useValue: step }], parent: this.injectorOf(root) });
    step.dialogRef = {
      close: (result?: unknown) => {
        const i = root.views().findIndex((v) => v.ref === step);
        if (i === -1) return;
        root.views.update((views) => views.slice(0, i));
        this.release(step, () => step.notifyClosed(result));
      },
    };
    container()?.rememberOpener();
    root.views.update((views) => [...views, { component, ref: step, injector }]);
    this.register(step);
    return step;
  }

  private injectorOf(root: ArOverlayRef): Injector {
    return root.views()[0].injector;
  }

  /** Each open window and step gets a history entry, so the back button (Android / browser) closes the top one first. */
  private register(ref: ArOverlayRef): void {
    this.stack.push(ref);
    if (typeof history !== 'undefined') {
      history.pushState({ ...(history.state ?? {}), arOverlay: this.stack.length }, '');
    }
  }

  /** Drops `ref` and the steps above it, rewinds their history entries, then notifies. */
  private release(ref: ArOverlayRef, notify: () => void): void {
    const i = this.stack.indexOf(ref);
    if (i === -1) {
      notify();
      return;
    }
    const removed = this.stack.splice(i);
    removed.slice(1).forEach((r) => r.notifyClosed(undefined));
    const ownsEntry = typeof history !== 'undefined' && history.state?.arOverlay === i + removed.length;
    if (ownsEntry && this.yieldHistory) {
      this.yieldHistory = false;
      notify();
      return;
    }
    this.yieldHistory = false;
    if (ownsEntry) {
      let fired = false;
      const once = () => {
        if (fired) return;
        fired = true;
        notify();
      };
      this.pendingBack = once;
      history.go(-removed.length);
      setTimeout(() => {
        if (this.pendingBack === once) this.pendingBack = null;
        once();
      }, 400);
    } else {
      notify();
    }
  }

  closeAll(): void {
    [...this.stack].filter((r) => !r.isStep).reverse().forEach((r) => r.close());
  }
}

export { DIALOG_DATA };
