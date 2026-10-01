import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

/**
 * Title of the page for content known after the route (a deck's name). The embedded app goes through the site
 * (`AlteredCore.setTitle`, which appends the site's name); elsewhere, the document title.
 */
@Service({ factory: () => new DocumentPageTitle() })
export abstract class PageTitle {
  abstract set(title: string): void;
}

class DocumentPageTitle extends PageTitle {
  private readonly title = inject(Title);
  set(title: string): void {
    this.title.setTitle(title);
  }
}
