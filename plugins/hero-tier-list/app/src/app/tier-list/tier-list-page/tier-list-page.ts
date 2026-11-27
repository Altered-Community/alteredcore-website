import { Component, computed, inject, signal } from '@angular/core';
import { MAX_TIERS, MAX_TITLE, type Ranking, addTier, moveHero, setTitle, shiftHero, tierOf, unrankAll } from '../../core/ranking';
import { exportFileName, renderTierListPng } from '../../core/png-export';
import { TierListStore, type TileSize } from '../../core/tier-list.store';
import { EMBED_MOUNT } from '../../embed/host';
import { AcIcon } from '../../ui/icon';
import { HeroPool } from '../hero-pool/hero-pool';
import { HeroTile } from '../hero-tile/hero-tile';
import { TierRow } from '../tier-row/tier-row';

const DEFAULT_TITLE = $localize`:@@page.title:Tier list des héros`;

/** Tile widths, from the « Taille » control; one step smaller on phones (tier-list-page.scss). */
const SIZES: { id: TileSize; label: string }[] = [
  { id: 'sm', label: $localize`:@@size.sm:S` },
  { id: 'md', label: $localize`:@@size.md:M` },
  { id: 'lg', label: $localize`:@@size.lg:L` },
];

/**
 * The hero tier list: tiers on the left, heroes to rank on the right (below on narrow screens). Heroes move by drag
 * and drop (`drag/hero-drag.ts`) or, on touch and keyboard, by picking a hero then a tier in the action bar.
 */
@Component({
  selector: 'ac-hero-tier-list',
  imports: [TierRow, HeroPool, HeroTile, AcIcon],
  templateUrl: './tier-list-page.html',
  styleUrl: './tier-list-page.scss',
  host: {
    '(document:keydown.escape)': 'store.select(null)',
  },
})
export class TierListPage {
  protected readonly store = inject(TierListStore);
  private readonly mount = inject(EMBED_MOUNT);

  protected readonly sizes = SIZES;
  protected readonly maxTitle = MAX_TITLE;
  protected readonly maxTiers = MAX_TIERS;
  protected readonly editing = signal(false);
  protected readonly exporting = signal(false);
  protected readonly toast = signal<{ message: string; undo: boolean } | null>(null);
  /** The ranking right after « Tout retirer »: its toast offers to undo it only while nothing else has changed. */
  protected readonly canUndoReset = computed(() => this.store.ranking() === this.resetResult());
  private readonly resetResult = signal<Ranking | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly heading = computed(() => this.store.ranking().title || DEFAULT_TITLE);
  protected readonly selectedTier = computed(() => {
    const hero = this.store.selected();
    return hero ? tierOf(this.store.ranking(), hero.id) : null;
  });
  protected readonly selectedIndex = computed(() => {
    const hero = this.store.selected();
    const tier = this.selectedTier();
    return hero && tier ? tier.heroes.indexOf(hero.id) : -1;
  });

  protected rename(value: string): void {
    this.store.apply((r) => setTitle(r, value));
  }

  protected addTier(): void {
    this.store.apply((r) => addTier(r, $localize`:@@tier.new:Nouveau`));
  }

  protected reset(): void {
    if (!this.store.rankedCount()) return;
    this.store.apply(unrankAll);
    this.resetResult.set(this.store.ranking());
    this.store.select(null);
    this.showToast($localize`:@@toast.reset:Tous les héros sont de nouveau à classer.`, true);
  }

  protected place(tierId: string | null): void {
    const hero = this.store.selected();
    if (!hero) return;
    this.store.apply((r) => moveHero(r, hero.id, tierId));
    this.store.select(null);
  }

  protected shift(delta: -1 | 1): void {
    const hero = this.store.selected();
    if (hero) this.store.apply((r) => shiftHero(r, hero.id, delta));
  }

  protected undoFromToast(): void {
    if (this.canUndoReset()) this.store.undo();
    this.hideToast();
  }

  protected async exportPng(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const ranked = this.store.rankedCount();
      const total = this.store.heroes().length;
      const date = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'long' }).format(new Date());
      const blob = await renderTierListPng({
        title: this.heading(),
        subtitle: $localize`:@@export.subtitle:${ranked}:ranked: héros classés sur ${total}:total: · ${date}:date:`,
        credit: $localize`:@@export.credit:Altered Fan Content · Illustrations © Equinox et leurs artistes · altered.re`,
        rows: this.store.rows(),
        themeSource: this.mount.container,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(this.heading());
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      this.showToast($localize`:@@toast.exported:Image PNG téléchargée.`, false);
    } catch (err) {
      console.error('Hero tier list: PNG export failed', err);
      this.showToast($localize`:@@toast.export-failed:L’export PNG a échoué. Réessaie dans un instant.`, false);
    } finally {
      this.exporting.set(false);
    }
  }

  private showToast(message: string, undo: boolean): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, undo });
    this.toastTimer = setTimeout(() => this.toast.set(null), 6000);
  }

  protected hideToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }
}
