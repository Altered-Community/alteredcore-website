import { Component, input, model } from '@angular/core';
import { AcIcon } from '../../icon';
import { nextId } from '../value-accessor';

/**
 * File picker — DS-Champs: a real `<input type="file">` under a control-sized button that shows
 * the chosen file name (keyboard and screen readers get the native control). Look: `ac-file-input`.
 */
@Component({
  selector: 'ac-file-input',
  imports: [AcIcon],
  host: { class: 'ac-file-input' },
  templateUrl: './file-input.html',
})
export class AcFileInput {
  readonly file = model<File | null>(null);
  readonly label = input('');
  /** `accept` of the native input, e.g. `.zip,application/zip`. */
  readonly accept = input('');
  readonly disabled = input(false);
  protected readonly id = nextId('ac-file-input');
  protected readonly placeholder = $localize`:@@ui.fileInput.choose:Choisir un fichier…`;

  protected pick(input: HTMLInputElement): void {
    this.file.set(input.files?.[0] ?? null);
  }
}
