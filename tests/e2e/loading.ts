/**
 * Loading checks of SPA pages: the server's skeleton, then the plugin's first screen, then its data. Used by the e2e
 * tests (plugins/<id>/e2e/loading.spec.ts) and by tests/e2e/loading-timeline.ts (frame-by-frame evidence).
 *
 * watchLoading() installs a recorder in the page before it loads. It notes:
 * - layout shifts (the browser's CLS entries), with the boxes that moved (a plugin's nodes sit in a shadow root, which
 *   the entries do not name);
 * - `empty-frame`: the first frame painted without the server's placeholder (the site header alone), or the
 *   placeholder taken away while the plugin shows nothing yet;
 * - `unstyled`: the plugin shown before its shadow root's stylesheets have loaded;
 * - `placeholder-font`: the placeholder losing the site's font (it shows through the plugin's shadow root);
 * - `text`: a text that must never show, in a given element (a « Chargement… » title its skeleton replaces).
 *
 * Self-contained (types only from Playwright): tests/e2e/loading-timeline.ts runs it with Node's type stripping.
 */
import type { BrowserContextOptions, Page, TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** A box in viewport pixels: x, y, width, height. */
export type Rect = [number, number, number, number];
export interface LoadingShift {
  t: number;
  value: number;
  boxes: string[];
  /** Where each box was and where it went, for cls warnings to draw them. */
  moves: { from: Rect; to: Rect }[];
}
export interface LoadingIssue {
  t: number;
  kind: 'empty-frame' | 'unstyled' | 'placeholder-font' | 'text';
  detail: string;
}
export interface LoadingReport {
  cls: number;
  shifts: LoadingShift[];
  issues: LoadingIssue[];
  /** When the placeholder went (ms from navigation start), null if it is still there. */
  placeholderGoneAt: number | null;
}
/** A text that must never show in the elements `selector` matches (in the plugin's shadow root or the page). */
export interface ForbiddenText {
  selector: string;
  text: string;
}

/** Network and CPU of a slow phone (Lighthouse's mobile: 150 ms RTT, 1.6 Mbit/s, CPU 4×), or no throttling. */
export const PROFILES = {
  phone: { cpu: 4, latency: 150, down: 1.6e6 / 8, up: 750e3 / 8 },
  slowPhone: { cpu: 6, latency: 300, down: 750e3 / 8, up: 250e3 / 8 },
  fast: { cpu: 1, latency: 0, down: -1, up: -1 },
} as const;
export type Profile = keyof typeof PROFILES;

/** Phones, tablets, laptops and desktops on both sides of the breakpoints (768 medium, 1200 expanded, the editor's 1440). */
export const VIEWPORTS: Record<string, BrowserContextOptions> = {
  'phone-s': { viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'laptop-s': { viewport: { width: 1024, height: 768 } },
  laptop: { viewport: { width: 1280, height: 800 } },
  'laptop-m': { viewport: { width: 1366, height: 768 } },
  desktop: { viewport: { width: 1440, height: 900 } },
  wide: { viewport: { width: 1920, height: 1080 } },
};

/** Installs the recorder for the next navigations of `page` (call it before page.goto()). */
export async function watchLoading(page: Page, forbidden: ForbiddenText[] = []): Promise<void> {
  await page.addInitScript(recorder, forbidden);
}

/** What the recorder noted since the page loaded. */
export async function loadingReport(page: Page): Promise<LoadingReport> {
  const raw = await page.evaluate(() => (window as unknown as { __acLoading?: Omit<LoadingReport, 'cls'> }).__acLoading ?? null);
  if (!raw) throw new Error('watchLoading() was not installed before this page loaded');
  return { ...raw, cls: Math.round(raw.shifts.reduce((sum, s) => sum + s.value, 0) * 10000) / 10000 };
}

/** The report's problems, one line each: issues, and a CLS over `maxCls`. Empty when the loading was smooth. */
export function loadingProblems(report: LoadingReport, maxCls = 0.01): string[] {
  const out = report.issues.map((i) => `${i.kind} at ${i.t} ms: ${i.detail}`);
  const cls = clsProblem(report, maxCls);
  if (cls) out.push(cls);
  if (report.placeholderGoneAt === null && report.issues.length === 0) out.push('the placeholder never went away');
  return out;
}

/** A CLS over `maxCls`, with the shifts and the boxes that moved; null within the budget. */
export function clsProblem(report: LoadingReport, maxCls = 0.01): string | null {
  if (report.cls <= maxCls) return null;
  return `CLS ${report.cls} > ${maxCls}: ${report.shifts.map((s) => `${s.t} ms ${s.value} [${s.boxes.join('; ')}]`).join(' | ')}`;
}

/**
 * A CLS over budget as a warning, not a failure: the CLS of a screen varies from one CI run to the next. Attaches a
 * screenshot of the settled page, the boxes that moved drawn on it (dashed: before, solid: after), and adds a
 * `cls warning` annotation. With E2E_CLS_WARNINGS_DIR, also writes `<slug>.png` and `<slug>.json` there: the CI
 * posts them as a pull request comment.
 */
export async function clsWarning(page: Page, testInfo: TestInfo, report: LoadingReport, maxCls: number): Promise<void> {
  const problem = clsProblem(report, maxCls);
  if (!problem) return;
  await page.evaluate((moves) => {
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    for (const { from, to } of moves) {
      for (const [[x, y, w, h], line] of [[from, 'dashed'], [to, 'solid']] as const) {
        const box = document.createElement('div');
        box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:3px ${line} #e5007e;box-sizing:border-box`;
        layer.append(box);
      }
    }
    document.body.append(layer);
  }, report.shifts.flatMap((s) => s.moves));
  const body = await page.screenshot();
  await testInfo.attach('cls-warning', { body, contentType: 'image/png' });
  testInfo.annotations.push({ type: 'cls warning', description: problem });
  const dir = process.env['E2E_CLS_WARNINGS_DIR'];
  if (dir) {
    const slug = `${testInfo.project.name}-${testInfo.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${slug}.png`), body);
    writeFileSync(join(dir, `${slug}.json`), JSON.stringify({
      title: testInfo.title,
      project: testInfo.project.name,
      cls: report.cls,
      budget: maxCls,
      shifts: report.shifts.map(({ t, value, boxes }) => ({ t, value, boxes })),
    }, null, 2));
  }
}

/** CPU and network of `profile` for this page (Chromium, through the DevTools protocol). */
export async function throttle(page: Page, profile: Profile): Promise<void> {
  const p = PROFILES[profile];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.latency, downloadThroughput: p.down, uploadThroughput: p.up });
}

/** A first visit: no HTTP cache, no service worker (its own requests would escape the throttling). */
export async function emptyCache(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (const registration of (await navigator.serviceWorker?.getRegistrations()) ?? []) await registration.unregister();
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
}

/** Runs in the page, before its scripts (addInitScript): serialised by Playwright, so self-contained. */
function recorder(forbidden: ForbiddenText[]): void {
  const state = { shifts: [] as LoadingShift[], issues: [] as LoadingIssue[], placeholderGoneAt: null as number | null };
  (window as unknown as { __acLoading: typeof state }).__acLoading = state;
  const now = () => Math.round(performance.now());
  const seen = new Set<string>();
  const issue = (kind: LoadingIssue['kind'], detail: string) => {
    if (seen.has(kind + detail)) return;
    seen.add(kind + detail);
    state.issues.push({ t: now(), kind, detail });
  };

  // The element now in a box that moved: the entry's node, or (a node of a shadow root, which the entry leaves out) the
  // element at the box's centre in the plugin's shadow root. `ac-select.q < div.row`: the element and two ancestors.
  const describe = (node: Node | null | undefined, r: DOMRectReadOnly) => {
    let el = node instanceof Element ? node : (node?.parentElement ?? null);
    if (!el && r.width && r.height) {
      const host = document.querySelector('[data-ac-plugin]');
      el = (host?.shadowRoot ?? document).elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    }
    const names: string[] = [];
    for (let e = el; e && names.length < 3; e = e.parentElement ?? ((e.getRootNode() as ShadowRoot).host ?? null)) {
      names.push(e.localName + [...e.classList].slice(0, 2).map((c) => `.${c}`).join(''));
    }
    return names.length ? ` (${names.join(' < ')})` : '';
  };
  type ShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean; sources: { node?: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as ShiftEntry[]) {
      if (e.hadRecentInput) continue;
      const box = (r: DOMRectReadOnly) => `x${Math.round(r.x)} y${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`;
      const rect = (r: DOMRectReadOnly): Rect => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      state.shifts.push({
        t: Math.round(e.startTime),
        value: Math.round(e.value * 10000) / 10000,
        boxes: e.sources.map((s) => `${box(s.previousRect)} → ${box(s.currentRect)}${describe(s.node, s.currentRect)}`),
        moves: e.sources.map((s) => ({ from: rect(s.previousRect), to: rect(s.currentRect) })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });

  const hostOf = (el: Element | null) => el?.closest('[data-ac-plugin]') ?? document.querySelector('[data-ac-plugin]');
  const rootOf = (host: Element | null) => (host?.shadowRoot ?? host)?.querySelector<HTMLElement>('.ac-plugin-root') ?? null;
  const unloadedSheets = (host: Element | null) =>
    [...(host?.shadowRoot?.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]') ?? [])].filter((l) => !l.sheet).map((l) => l.href.split('/').pop());
  const shows = (root: HTMLElement) => getComputedStyle(root).visibility !== 'hidden' && root.getBoundingClientRect().height >= 1
    && !!(root.querySelector('.ac-skeleton, img, svg, canvas') || root.innerText.trim());

  // The placeholder goes: what the plugin shows in its place is what the next frame paints (a microtask, before paint).
  new MutationObserver((records) => {
    for (const r of records) {
      for (const node of r.removedNodes) {
        if (!(node instanceof HTMLElement) || !node.classList.contains('ac-spa-placeholder') || node.isConnected) continue;
        state.placeholderGoneAt = now();
        const host = hostOf(r.target as Element);
        const root = rootOf(host);
        if (!root || !shows(root)) issue('empty-frame', 'the placeholder went while the plugin showed nothing');
        const pending = unloadedSheets(host);
        if (pending.length) issue('unstyled', `the placeholder went before ${pending.join(', ')} loaded`);
      }
    }
  }).observe(document, { childList: true, subtree: true });

  // Every frame: the plugin shown unstyled, the placeholder's font, forbidden texts.
  let first = true;
  const frame = () => {
    const placeholder = document.querySelector<HTMLElement>('.ac-spa-placeholder');
    // The first frame (an SPA page: the server renders the placeholder): it must show, at its size.
    if (first && document.querySelector('[data-ac-plugin]') && !(placeholder && placeholder.getBoundingClientRect().height >= 1)) {
      issue('empty-frame', 'the first frame was painted without the placeholder');
    }
    if (document.querySelector('[data-ac-plugin]')) first = false;
    const host = hostOf(placeholder);
    const root = rootOf(host);
    if (root && getComputedStyle(root).visibility !== 'hidden' && root.getBoundingClientRect().height >= 1) {
      const pending = unloadedSheets(host);
      if (pending.length) issue('unstyled', `the plugin showed before ${pending.join(', ')} loaded`);
    }
    if (placeholder && document.body) {
      const font = getComputedStyle(placeholder).fontFamily;
      if (font !== getComputedStyle(document.body).fontFamily) issue('placeholder-font', `the placeholder turned to « ${font} »`);
    }
    for (const f of forbidden) {
      for (const el of [...((host?.shadowRoot ?? document).querySelectorAll<HTMLElement>(f.selector))]) {
        if (el.innerText.includes(f.text)) issue('text', `« ${f.text} » in ${f.selector}`);
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
