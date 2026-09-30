import { Component, inject } from '@angular/core';
import type { CommunityBuilder } from '../../../core/community-builders.service';
import { ArButton } from '../../../ui/buttons';
import { ArCardSurface } from '../../../ui/containers';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

/** « Deckbuilders communautaires »: the site's community deckbuilders, each with a link (the site's decks page window). */
@Component({
  selector: 'app-community-builders',
  imports: [ArButton, ArCardSurface],
  host: { class: 'ar-overlay-content' },
  templateUrl: './community-builders.overlay.html',
  styleUrl: './community-builders.overlay.scss',
})
export class CommunityBuildersOverlay {
  protected readonly builders = inject<ArOverlayRef<void, CommunityBuilder[]>>(ArOverlayRef).data;
}

export function openCommunityBuilders(overlay: ArOverlayService, builders: CommunityBuilder[]): ArOverlayRef<void, CommunityBuilder[]> {
  return overlay.open<CommunityBuildersOverlay, void, CommunityBuilder[]>(CommunityBuildersOverlay, {
    title: $localize`:@@decks.builders.title:Deckbuilders communautaires`,
    data: builders,
    width: 800,
  });
}
