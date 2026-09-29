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
 * and legal); the like button sits outside the link and emits `likeToggle`.
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
  readonly variant = input<'mine' | 'community'>('mine');
  readonly likeToggle = output<void>();
  protected readonly link = computed(() => ['/decks', this.deck().id]);
  protected readonly factionLogo = computed(() => factionSrc(this.deck().hero?.faction));
  protected readonly factionLabel = computed(() => factionName(this.deck().hero?.faction));
  protected readonly updatedLabel = computed(() => relativeTime(this.deck().updatedAt));
  protected readonly likeLabel = computed(() => `J’aime ${this.deck().name}, ${this.deck().likes} j’aime`);
  protected readonly ariaLabel = computed(() => {
    const d = this.deck();
    return [d.name, d.formatLabel, this.variant() === 'community' && d.author ? `par ${d.author}` : null].filter(Boolean).join(', ');
  });
}
