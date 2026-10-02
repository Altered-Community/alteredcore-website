import { Component, input, model } from '@angular/core';

/** Switch that applies at once: `ac-switch` (design-system/css/components/field.css), a checkbox with `role="switch"`. */
@Component({
  selector: 'ac-switch',
  templateUrl: './switch.html',
})
export class AcSwitch {
  readonly label = input.required<string>();
  readonly checked = model(false);
}
