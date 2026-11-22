import { Service, inject } from '@angular/core';
import { PageTitle } from '../core/page-title';
import { ALTERED_CORE } from './host';

/** Titles go through the site, which appends its own name (as the route titles, `EmbedTitleStrategy`). */
@Service({ autoProvided: false })
export class HostPageTitle extends PageTitle {
  private readonly host = inject(ALTERED_CORE);
  set(title: string): void {
    this.host.setTitle(title);
  }
}
