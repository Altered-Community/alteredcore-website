import { Component, input } from '@angular/core';

@Component({
  selector: 'ar-logic-divider',
  host: { role: 'separator' },
  templateUrl: './logic-divider.html',
  styleUrl: './logic-divider.scss',
})
export class ArLogicDivider {
  readonly label = input('et');
}
