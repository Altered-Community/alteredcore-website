import { Component, input } from '@angular/core';

/**
 * Application bar of compact screens (the site draws its own header above): projected `[leading]`,
 * title / subtitle, projected `[actions]`.
 */
@Component({
  selector: 'ar-app-bar',
  templateUrl: './app-bar.html',
  styleUrl: './app-bar.scss',
})
export class ArAppBar {
  readonly title = input('');
  readonly subtitle = input('');
}
