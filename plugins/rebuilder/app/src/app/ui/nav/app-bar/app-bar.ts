import { Component, input } from '@angular/core';

/**
 * Screen bar of compact layouts (< 768 px), under the site header: projected `[leading]`,
 * title / subtitle, projected `[actions]`.
 */
@Component({
  selector: 'ac-app-bar',
  templateUrl: './app-bar.html',
  styleUrl: './app-bar.scss',
})
export class AcAppBar {
  readonly title = input('');
  readonly subtitle = input('');
}
