import { Component, inject } from '@angular/core';
import type { CommunityBuilder } from '../../../core/community-builders.service';
import { AcButton } from '../../../ui/buttons';
import { AcCardSurface } from '../../../ui/containers';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

/** « Deckbuilders communautaires »: the site's community deckbuilders, each with a link (the site's decks page window). */
@Component({
  selector: 'app-community-builders',
  imports: [AcButton, AcCardSurface],
  host: { class: 'ac-overlay-content' },
  templateUrl: './community-builders.overlay.html',
  styleUrl: './community-builders.overlay.scss',
})
export class CommunityBuildersOverlay {
  protected readonly builders = inject<AcOverlayRef<void, CommunityBuilder[]>>(AcOverlayRef).data;
}

export function openCommunityBuilders(overlay: AcOverlayService, builders: CommunityBuilder[]): AcOverlayRef<void, CommunityBuilder[]> {
  return overlay.open<CommunityBuildersOverlay, void, CommunityBuilder[]>(CommunityBuildersOverlay, {
    title: $localize`:@@decks.builders.title:Deckbuilders communautaires`,
    data: builders,
    width: 800,
  });
}
