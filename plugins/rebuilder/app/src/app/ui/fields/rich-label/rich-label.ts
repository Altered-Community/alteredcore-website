import { Component, input } from '@angular/core';
import type { RichPart } from '../../../core/card-text';

/** What `ac-rich-label` shows: the plain text, a leading glyph, and the text as the card prints it when there is one. */
export interface RichLabelValue {
  text: string;
  glyph?: string;
  rich?: RichPart[];
}

/**
 * An ability's label as the card prints it: the `alteredicons` symbols (`{D}`, `{V}`…) as glyphs named for screen
 * readers, keywords in bold without their brackets. Plain `text` when the value has no `rich` runs.
 */
@Component({
  selector: 'ac-rich-label',
  templateUrl: './rich-label.html',
  styleUrl: './rich-label.scss',
})
export class AcRichLabel {
  readonly value = input.required<RichLabelValue>();

  protected isGlyph(p: RichPart): p is Extract<RichPart, { glyph: string }> {
    return 'glyph' in p;
  }
}
