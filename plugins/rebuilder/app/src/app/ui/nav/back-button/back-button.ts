import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ArIconButton } from '../../buttons';
import { ArNavigationHistory } from '../navigation-history';

/** « Retour » for compact app bars: previous page of the app, or `fallback` when the page was opened directly. */
@Component({
  selector: 'ar-back-button',
  imports: [ArIconButton],
  templateUrl: './back-button.html',
})
export class ArBackButton {
  private readonly history = inject(ArNavigationHistory);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  readonly fallback = input.required<string>();
  readonly label = input($localize`:@@ui.backButton.label:Retour`);

  protected back(): void {
    if (this.history.canGoBack) this.location.back();
    else void this.router.navigateByUrl(this.fallback());
  }
}
