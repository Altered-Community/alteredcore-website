import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { factionSrc } from '../../../core/assets';
import { relativeTime } from '../../../core/relative-time';
import type { DeckListItem } from '../../../core/deck-view';
import { AcLikeButton } from '../../buttons';
import { AcBadge, AcRaritySummary } from '../../chips';
import { AcIcon } from '../../icon';
import { AcCardArt } from '../card-art/card-art';
import { factionName } from '../factions';

/**
 * Deck in the deck list: grid card (expanded) or row (compact).
 * `mine`: visibility, legality, card count and rarities. `community`: author, last update and like count instead (every listed deck is public
 * and legal); the like button sits outside the link and emits `likeToggle`. `contest`: card count and rarities, a « Gagnant » badge
 * on the winners of the Starter Deck Contest.
 */
@Component({
  selector: 'ac-deck-card',
  imports: [RouterLink, AcCardArt, AcBadge, AcIcon, AcRaritySummary, AcLikeButton],
  host: { '[class]': "'ac-deck-card--' + layout()" },
  templateUrl: './deck-card.html',
  styleUrl: './deck-card.scss',
})
export class AcDeckCard {
  readonly deck = input.required<DeckListItem>();
  readonly layout = input<'grid' | 'row'>('grid');
  readonly variant = input<'mine' | 'community' | 'contest'>('mine');
  readonly likeToggle = output<void>();
  protected readonly link = computed(() => ['/decks', this.deck().id]);
  protected readonly factionLogo = computed(() => factionSrc(this.deck().hero?.faction));
  protected readonly factionLabel = computed(() => factionName(this.deck().hero?.faction));
  protected readonly updatedLabel = computed(() => relativeTime(this.deck().updatedAt));
  protected readonly publicLabel = $localize`:@@ui.deckCard.public:Public`;
  protected readonly privateLabel = $localize`:@@ui.deckCard.private:Privé`;
  protected readonly noHero = $localize`:@@ui.deckCard.noHero:Sans héros`;
  protected readonly likeLabel = computed(() => {
    const { name, likes } = this.deck();
    return likes === 1
      ? $localize`:@@ui.deckCard.likeOne:J’aime ${name}:name:, ${likes}:likes: j’aime`
      : $localize`:@@ui.deckCard.like:J’aime ${name}:name:, ${likes}:likes: j’aime`;
  });
  protected readonly ariaLabel = computed(() => {
    const d = this.deck();
    return [d.name, d.formatLabel, this.variant() === 'community' && d.author ? $localize`:@@ui.deckCard.by:par ${d.author}:author:` : null].filter(Boolean).join(', ');
  });
}
