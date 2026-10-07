import { Component, input } from '@angular/core';

/**
 * Application bar of compact screens (the site draws its own header above): projected `[leading]`,
 * title / subtitle (or a projected `[titles]` when both are empty), projected `[actions]`.
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
