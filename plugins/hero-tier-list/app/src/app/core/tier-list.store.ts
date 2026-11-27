import { Service, computed, signal } from '@angular/core';
import { fetchHeroes, type Hero } from './heroes';
import { uiLocale } from './i18n';
import { normalizeRanking, type Ranking } from './ranking';

export type TileSize = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'ac-hero-tier-list';
const HISTORY_LIMIT = 100;

interface Saved {
  ranking: Ranking;
  size: TileSize;
  /** Heroes the cards API listed last time: the number of skeletons while it loads again. */
  heroCount?: number;
}

/** Skeletons on a first visit, before the cards API has ever answered (36 heroes in November 2026). */
const DEFAULT_HERO_COUNT = 36;

/**
 * State of the tier list: the heroes (cards API), the ranking with its undo / redo history, the hero picked for a
 * tap-to-place, and the tile size. The ranking and the size are kept in `localStorage`, on this browser only.
 */
@Service()
export class TierListStore {
  readonly heroes = signal<Hero[]>([]);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly ranking = signal<Ranking>(normalizeRanking(null));
  readonly size = signal<TileSize>('md');
  /** Hero picked by a tap or the keyboard, placed with the action bar. */
  readonly selectedId = signal<string | null>(null);

  private readonly past = signal<Ranking[]>([]);
  private readonly future = signal<Ranking[]>([]);
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);

  readonly heroById = computed(() => new Map(this.heroes().map((h) => [h.id, h])));
  /** Tiers with their heroes resolved; ids of heroes the API no longer lists are skipped. */
  readonly rows = computed(() => {
    const byId = this.heroById();
    return this.ranking().tiers.map((tier) => ({ tier, heroes: tier.heroes.map((id) => byId.get(id)).filter((h): h is Hero => !!h) }));
  });
  readonly rankedIds = computed(() => new Set(this.ranking().tiers.flatMap((t) => t.heroes)));
  readonly pool = computed(() => this.heroes().filter((h) => !this.rankedIds().has(h.id)));
  readonly rankedCount = computed(() => this.heroes().length - this.pool().length);
  private readonly heroCount = signal(DEFAULT_HERO_COUNT);
  /** Skeletons of the heroes to rank while the heroes load: the last count, minus the heroes already ranked. */
  readonly poolSkeletons = computed(() => Math.max(0, this.heroCount() - this.rankedIds().size));
  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? (this.heroById().get(id) ?? null) : null;
  });

  constructor() {
    const saved = this.read();
    if (saved) {
      this.ranking.set(normalizeRanking(saved.ranking));
      if (saved.size === 'sm' || saved.size === 'md' || saved.size === 'lg') this.size.set(saved.size);
      if (typeof saved.heroCount === 'number' && saved.heroCount > 0 && saved.heroCount < 500) this.heroCount.set(saved.heroCount);
    }
    void this.load();
  }

  async load(): Promise<void> {
    this.status.set('loading');
    try {
      const heroes = await fetchHeroes(uiLocale());
      this.heroes.set(heroes);
      this.heroCount.set(heroes.length);
      this.status.set('ready');
      this.save();
    } catch (err) {
      console.error('Hero tier list: heroes not loaded', err);
      this.status.set('error');
    }
  }

  /** Applies a change to the ranking, recorded in the history. A change that returns the same value is not. */
  apply(change: (r: Ranking) => Ranking): void {
    const before = this.ranking();
    const after = change(before);
    if (after === before) return;
    this.past.update((p) => [...p, before].slice(-HISTORY_LIMIT));
    this.future.set([]);
    this.ranking.set(after);
    this.save();
  }

  undo(): void {
    const past = this.past();
    if (!past.length) return;
    this.future.update((f) => [this.ranking(), ...f]);
    this.past.set(past.slice(0, -1));
    this.ranking.set(past[past.length - 1]);
    this.save();
  }

  redo(): void {
    const [next, ...rest] = this.future();
    if (!next) return;
    this.past.update((p) => [...p, this.ranking()]);
    this.future.set(rest);
    this.ranking.set(next);
    this.save();
  }

  setSize(size: TileSize): void {
    this.size.set(size);
    this.save();
  }

  select(id: string | null): void {
    this.selectedId.update((current) => (current === id ? null : id));
  }

  /** A tap on a hero picks it, or lets it go; the click that some browsers send at the end of a drag is ignored. */
  tap(id: string): void {
    if (performance.now() - this.lastDragEnd < 250) return;
    this.select(id);
  }

  dragEnded(): void {
    this.lastDragEnd = performance.now();
  }

  private lastDragEnd = -Infinity;

  private read(): Saved | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ranking: this.ranking(), size: this.size(), heroCount: this.heroCount() } satisfies Saved));
    } catch {
      // Storage full or blocked (private window): the ranking stays for this visit.
    }
  }
}
