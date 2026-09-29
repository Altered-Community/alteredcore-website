import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Breadcrumb trail: `ac-breadcrumb` (design-system/css/components/navigation.css). */
@Component({
  selector: 'ac-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
})
export class AcBreadcrumb {
  readonly items = input<{ label: string; route?: string }[]>([]);
}
