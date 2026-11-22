import { Component, computed, inject } from '@angular/core';
import { illegalLabel, legalityRuleLabel, problemCount } from '../../../core/deck-legality';
import { rarityLimits } from '../../../core/format-rules';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { AcButton } from '../../../ui/buttons';
import { AcBadge } from '../../../ui/chips';
import { AcProgressBar } from '../../../ui/containers';
import { AcIcon } from '../../../ui/icon';
import { AcCardArt, factionName, rarityLimitItems } from '../../../ui/metier';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { editorLegality } from '../editor-legality';

/** What the summary leads to once closed: the hero picker, the legality details or the « Deck » view. */
export type DeckOverviewAction = 'hero' | 'legality' | 'deck';

/** The bar of a capped rarity: green at the cap, red above it. */
const BAR_TONES = { under: 'primary', at: 'success', over: 'danger' } as const;

/**
 * « Résumé du deck » on phones, from the app bar of the search view: the hero (and « Changer de héros »), the legality,
 * the rarities against the format's caps and the counts per type. It follows the deck while open.
 */
@Component({
  selector: 'app-deck-overview',
  imports: [AcButton, AcBadge, AcCardArt, AcIcon, AcProgressBar],
  host: { class: 'ac-overlay-content' },
  templateUrl: './deck-overview.overlay.html',
  styleUrl: './deck-overview.overlay.scss',
})
export class DeckOverviewOverlay {
  protected readonly ref = inject<AcOverlayRef<DeckOverviewAction>>(AcOverlayRef);
  protected readonly deck = inject(DeckStore);

  protected readonly meta = computed(() =>
    [
      factionName(this.deck.hero()?.faction),
      formatInfo(this.deck.format()).label,
      this.deck.isPublic() ? $localize`:@@editor.public:Public` : $localize`:@@editor.private:Privé`,
    ]
      .filter(Boolean)
      .join(' · '),
  );
  protected readonly legality = computed(() => editorLegality(this.deck));
  protected readonly legal = computed(() => this.legality().state === 'legal');
  protected readonly unknown = computed(() => this.legality().state === 'unknown');
  protected readonly legalityLabel = computed(() => {
    if (this.legal()) return $localize`:@@deck.page.legal:Légal`;
    return this.unknown() ? $localize`:@@deck.legality.unknown:Légalité non vérifiée` : illegalLabel(problemCount(this.legality()));
  });
  /** The decks API's problems (its messages, else its failed rules). */
  protected readonly problems = computed(() => {
    const l = this.legality();
    return l.errors.length ? l.errors : l.rules.map(legalityRuleLabel);
  });
  /** Rares, Exalteds and Uniques against the format's caps: a bar each, green at the cap, red above it. */
  protected readonly limits = computed(() =>
    rarityLimitItems(rarityLimits(this.deck.stats().rarity, this.deck.rules(), this.deck.hero()?.name)).map((r) => ({
      ...r,
      tone: BAR_TONES[r.state],
      value: r.limit > 0 ? Math.min(100, (r.count / r.limit) * 100) : r.count > 0 ? 100 : 0,
    })),
  );
  protected readonly rarityTitle = computed(() => $localize`:@@editor.overview.rarities:Raretés · ${formatInfo(this.deck.format()).label}:format:`);
  protected readonly changeHeroLabel = $localize`:@@ui.deckSummary.changeHero:Changer de héros`;
  protected readonly noHero = $localize`:@@ui.deckSummary.noHero:Aucun héros`;
}

export function openDeckOverview(overlay: AcOverlayService): AcOverlayRef<DeckOverviewAction> {
  return overlay.open<DeckOverviewOverlay, DeckOverviewAction>(DeckOverviewOverlay, {
    title: $localize`:@@editor.overview.title:Résumé du deck`,
    width: 480,
  });
}
