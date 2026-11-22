import { Component, input, model } from '@angular/core';

/** Checkbox, for a choice applied with the form's button: `ac-check` (design-system/css/components/field.css). */
@Component({
  selector: 'ac-checkbox',
  templateUrl: './checkbox.html',
})
export class AcCheckbox {
  readonly label = input.required<string>();
  readonly checked = model(false);
}
