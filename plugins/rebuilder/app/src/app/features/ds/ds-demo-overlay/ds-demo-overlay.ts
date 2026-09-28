import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArButton } from '../../../ui/buttons';
import { ArOverlayRef } from '../../../ui/overlay';

@Component({
  selector: 'app-ds-demo-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './ds-demo-overlay.html',
})
export class DsDemoOverlay {
  protected readonly ref = inject(ArOverlayRef);

  protected step(): void {
    this.ref.openStep(DsDemoOverlay, { title: 'Étape' });
  }
}
