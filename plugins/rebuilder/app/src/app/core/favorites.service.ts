import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, expand, map, reduce, type Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session';
import { contentLocale } from './locale';
import type { Card } from './models';

interface FavoritesPage {
  member: { reference?: string }[];
  lastPage: number;
}

/**
 * The user's favorite cards, the site's (plugin core-altered-cards: `favorites-search`, `favorites-toggle`, table
 * `{favorites}`), so a star set here shows on the site and the other way round. Signed in only.
 */
@Service()
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);
  private readonly refs = signal<ReadonlySet<string>>(new Set());
  private readonly pending = new Set<string>();
  /** Favorites can be read and changed: a signed-in user on the site. */
  readonly enabled = computed(() => this.auth.isLoggedIn() && this.base() !== null);

  constructor() {
    effect(() => {
      const user = this.auth.isLoggedIn() ? this.auth.username() : null;
      untracked(() => {
        this.refs.set(new Set());
        if (user && this.base() !== null) this.loadAll().subscribe({ next: (refs) => this.refs.set(new Set(refs)), error: () => undefined });
      });
    });
  }

  has(reference: string): boolean {
    return this.refs().has(reference);
  }

  /** Adds or removes `card`; the star follows the site's answer. */
  toggle(card: Card): void {
    const base = this.base();
    const ref = card.reference;
    if (base === null || this.pending.has(ref)) return;
    this.pending.add(ref);
    const body = new URLSearchParams({
      csrf_token: environment.siteCsrf,
      card_ref: ref,
      faction: card.faction?.code ?? '',
      rarity: card.rarity?.reference ?? '',
      card_set: card.set?.reference ?? ref.split('_')[1] ?? '',
    }).toString();
    this.http
      .post<{ ok?: boolean; favorited?: boolean }>(`${base}/favorites-toggle`, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }),
      })
      .subscribe({
        next: (res) => {
          this.pending.delete(ref);
          if (!res?.ok) return;
          this.refs.update((set) => {
            const next = new Set(set);
            if (res.favorited) next.add(ref);
            else next.delete(ref);
            return next;
          });
        },
        error: () => this.pending.delete(ref),
      });
  }

  /** Every favorite reference, page after page (200 a page, the batch limit of the endpoint). */
  private loadAll(): Observable<string[]> {
    const base = this.base() ?? '';
    const page = (n: number) =>
      this.http
        .get<FavoritesPage>(`${base}/favorites-search`, { params: { page: n, itemsPerPage: 200, locale: contentLocale() } })
        .pipe(map((res) => ({ n, res })));
    return page(1).pipe(
      expand(({ n, res }) => (n < (res.lastPage ?? 1) && n < 50 ? page(n + 1) : EMPTY)),
      reduce((all: string[], { res }) => [...all, ...(res.member ?? []).map((c) => c.reference ?? '').filter(Boolean)], []),
    );
  }

  /** The endpoints of the site's card plugin; `null` outside the site. */
  private base(): string | null {
    return environment.pluginApiUrl ? `${environment.siteUrl.replace(/\/$/, '')}/papi/core-altered-cards` : null;
  }
}
