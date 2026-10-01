import { Component, input, output } from '@angular/core';

/** Short notice at the bottom of the screen (`role=status`), with an optional action (« Annuler »): `ac-toast`. */
@Component({
  selector: 'ac-toast',
  host: { class: 'ac-toast', role: 'status', 'aria-live': 'polite' },
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class AcToast {
  readonly actionLabel = input('');
  readonly action = output<void>();
}
