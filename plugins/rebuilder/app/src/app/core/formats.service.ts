import { Service, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DecksApiService } from './decks-api.service';
import type { FormatRules } from './format-rules';

/**
 * The formats' rules from the decks API (`GET /api/formats?hiddenFormats=true`, through the site's decks relay),
 * fetched once. `undefined` while loading; an error leaves every format without rules (no cap in the editor, nothing
 * left out of the search): the decks API still validates each save.
 */
@Service()
export class FormatsService {
  private readonly decksApi = inject(DecksApiService);
  private readonly list = toSignal(this.decksApi.formats().pipe(catchError(() => of([] as FormatRules[]))));
  readonly loaded = computed(() => this.list() !== undefined);
  private readonly byCode = computed(() => new Map((this.list() ?? []).map((f) => [f.code, f])));

  /** Rules of `format` (aliases are the decks API's: the plugin uses the codes), `null` when unknown or not loaded. */
  rulesFor(format: string | null | undefined): FormatRules | null {
    return (format && this.byCode().get(format)) || null;
  }
}
