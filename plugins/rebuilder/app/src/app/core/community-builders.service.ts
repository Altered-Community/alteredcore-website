import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { uiLocale } from './i18n';

/** A community deckbuilder of the site (admin › Community builders). */
export interface CommunityBuilder {
  title: string;
  description: string;
  image: string | null;
  url: string;
}

/** The site's community deckbuilders (plugin endpoint `community-builders`); none outside the site or on an error. */
@Service()
export class CommunityBuildersService {
  private readonly http = inject(HttpClient);

  list(): Observable<CommunityBuilder[]> {
    if (!environment.pluginApiUrl) return of([]);
    const base = environment.pluginApiUrl.replace(/\/?$/, '/');
    return this.http.get<CommunityBuilder[]>(`${base}community-builders`, { params: { locale: uiLocale() } }).pipe(
      map((list) => (Array.isArray(list) ? list : [])),
      catchError(() => of([])),
    );
  }
}
