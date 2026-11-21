import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session';

/** Most copies of a card in the collection (the site's `set_qty` caps at 99). */
export const COLLECTION_MAX = 99;

/**
 * The user's physical collection, the site's (plugin core-altered-cards: `collection-qty`, the collection API behind it):
 * the copies of each card, changed from the card browser as on the site's former card search. Signed in, with the site's
 * collection turned on (`COLLECTION_MODE`) only.
 */
@Service()
export class CollectionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);
  private readonly quantities = signal<ReadonlyMap<string, number>>(new Map());
  private readonly on = signal(false);
  /** Cards whose request runs. */
  private readonly inFlight = new Set<string>();
  /** Last quantity asked per card while its request runs: sent once it ends. */
  private readonly queued = new Map<string, number>();
  /** Copies can be read and changed. */
  readonly enabled = computed(() => this.on() && this.auth.isLoggedIn());

  constructor() {
    effect(() => {
      const user = this.auth.isLoggedIn() ? this.auth.username() : null;
      untracked(() => {
        this.on.set(false);
        this.quantities.set(new Map());
        const url = this.url();
        if (!user || !url) return;
        this.http.get<{ enabled?: boolean; quantities?: Record<string, number> }>(url).subscribe({
          next: (res) => {
            this.quantities.set(new Map(Object.entries(res?.quantities ?? {})));
            this.on.set(!!res?.enabled);
          },
          error: () => undefined,
        });
      });
    });
  }

  quantity(reference: string): number {
    return this.quantities().get(reference) ?? 0;
  }

  /** Shown at once; back to the site's quantity if the change fails. Changes made while one runs: the last one is sent next. */
  set(reference: string, quantity: number): void {
    const url = this.url();
    if (!url || !this.enabled()) return;
    const qty = Math.max(0, Math.min(COLLECTION_MAX, Math.round(quantity)));
    const before = this.quantity(reference);
    this.write(reference, qty);
    if (this.inFlight.has(reference)) this.queued.set(reference, qty);
    else this.send(url, reference, qty, before);
  }

  private send(url: string, reference: string, qty: number, before: number): void {
    this.inFlight.add(reference);
    const body = new URLSearchParams({ csrf_token: environment.siteCsrf, ref: reference, qty: String(qty) }).toString();
    const done = (saved: number) => {
      this.inFlight.delete(reference);
      const next = this.queued.get(reference);
      this.queued.delete(reference);
      if (next !== undefined && next !== saved) this.send(url, reference, next, saved);
      else this.write(reference, saved);
    };
    this.http
      .post<{ ok?: boolean; qty?: number }>(url, body, { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }) })
      .subscribe({ next: (res) => done(res?.ok ? (res.qty ?? qty) : before), error: () => done(before) });
  }

  private write(reference: string, qty: number): void {
    this.quantities.update((map) => {
      const next = new Map(map);
      if (qty > 0) next.set(reference, qty);
      else next.delete(reference);
      return next;
    });
  }

  /** The endpoint of the site's card plugin; `null` outside the site. */
  private url(): string | null {
    return environment.pluginApiUrl ? `${environment.siteUrl.replace(/\/$/, '')}/papi/core-altered-cards/collection-qty` : null;
  }
}
