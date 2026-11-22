import { Service, inject } from '@angular/core';
import { TitleStrategy, type RouterStateSnapshot } from '@angular/router';
import { ALTERED_CORE } from './host';

/** Route titles go through the site, which appends its own name. */
@Service({ autoProvided: false })
export class EmbedTitleStrategy extends TitleStrategy {
  private readonly host = inject(ALTERED_CORE);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) this.host.setTitle(title);
  }
}
