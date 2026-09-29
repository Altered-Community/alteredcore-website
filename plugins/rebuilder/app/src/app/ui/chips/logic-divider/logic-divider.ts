import { Component, input } from '@angular/core';

@Component({
  selector: 'ac-logic-divider',
  host: { role: 'separator' },
  templateUrl: './logic-divider.html',
  styleUrl: './logic-divider.scss',
})
export class AcLogicDivider {
  readonly label = input('et');
}
