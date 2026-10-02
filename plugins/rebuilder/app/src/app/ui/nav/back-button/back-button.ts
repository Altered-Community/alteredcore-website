import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AcIconButton } from '../../buttons';
import { AcNavigationHistory } from '../navigation-history';

/** « Retour » for compact app bars: previous page of the app, or `fallback` when the page was opened directly. */
@Component({
  selector: 'ac-back-button',
  imports: [AcIconButton],
  templateUrl: './back-button.html',
})
export class AcBackButton {
  private readonly history = inject(AcNavigationHistory);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  readonly fallback = input.required<string>();
  readonly label = input($localize`:@@ui.backButton.label:Retour`);

  protected back(): void {
    if (this.history.canGoBack) this.location.back();
    else void this.router.navigateByUrl(this.fallback());
  }
}
