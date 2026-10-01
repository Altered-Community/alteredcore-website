import { Component, computed, input, output, signal } from '@angular/core';
import { deckImageFileName, type DeckImageSource } from '../../../core/deck-image';
import { ArSplitButton, type ArSplitButtonItem } from '../../../ui/buttons';
import { deckImageBusyMessage, runDeckImageAction, type DeckImageAction } from '../deck-image-actions';

/**
 * « Copier en image »: copies the deck's image (its link preview's) to the clipboard; the arrow's menu also saves it
 * or opens it in a new tab. Each outcome is told by `notice` (the page's toast).
 */
@Component({
  selector: 'app-deck-image-export',
  imports: [ArSplitButton],
  templateUrl: './deck-image-export.html',
})
export class DeckImageExport {
  readonly source = input.required<DeckImageSource>();
  /** The deck's name: the saved file's. */
  readonly name = input('');
  readonly notice = output<string>();

  protected readonly busy = signal(false);
  protected readonly busyLabel = deckImageBusyMessage();
  protected readonly items = computed<ArSplitButtonItem[]>(() => [
    {
      id: 'copy',
      icon: 'clipboard',
      label: $localize`:@@deck.image.copyItem:Copier dans le presse-papiers`,
      hint: $localize`:@@deck.image.copyHint:Pour le coller dans Discord ou ailleurs`,
      badge: $localize`:@@deck.image.default:Par défaut`,
    },
    { id: 'save', icon: 'download', label: $localize`:@@deck.image.save:Enregistrer l’image`, hint: `${deckImageFileName(this.name())} · 2400 × 1260` },
    { id: 'open', icon: 'external-link', label: $localize`:@@deck.image.open:Ouvrir dans un nouvel onglet` },
  ]);

  protected async run(action: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const message = await runDeckImageAction(action as DeckImageAction, this.source(), this.name());
    this.busy.set(false);
    if (message) this.notice.emit(message);
  }
}
