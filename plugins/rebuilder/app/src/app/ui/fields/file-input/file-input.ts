import { Component, input, model } from '@angular/core';
import { ArIcon } from '../../icon';
import { nextId } from '../value-accessor';

/**
 * File picker — DS-Champs: a real `<input type="file">` under a control-sized button that shows
 * the chosen file name (keyboard and screen readers get the native control).
 */
@Component({
  selector: 'ar-file-input',
  imports: [ArIcon],
  templateUrl: './file-input.html',
  styleUrl: './file-input.scss',
})
export class ArFileInput {
  readonly file = model<File | null>(null);
  readonly label = input('');
  /** `accept` of the native input, e.g. `.zip,application/zip`. */
  readonly accept = input('');
  readonly disabled = input(false);
  protected readonly id = nextId('ar-file-input');
  protected readonly placeholder = $localize`:@@ui.fileInput.choose:Choisir un fichier…`;

  protected pick(input: HTMLInputElement): void {
    this.file.set(input.files?.[0] ?? null);
  }
}
