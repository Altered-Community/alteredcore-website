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

/**
 * The site's community deckbuilders (plugin endpoint `community-builders`); none outside the site or on an error. On the
 * decks list opened from the server, the list its placeholder carries (placeholder.php): the banner is on the page's
 * first screen rather than pushing the page down when the list arrives.
 */
@Service()
export class CommunityBuildersService {
  private readonly http = inject(HttpClient);
  private readonly fromServer = serverList();

  list(): Observable<CommunityBuilder[]> {
    if (this.fromServer) return of(this.fromServer);
    if (!environment.pluginApiUrl) return of([]);
    const base = environment.pluginApiUrl.replace(/\/?$/, '/');
    return this.http.get<CommunityBuilder[]>(`${base}community-builders`, { params: { locale: uiLocale() } }).pipe(
      map((list) => (Array.isArray(list) ? list : [])),
      catchError(() => of([])),
    );
  }
}

function serverList(): CommunityBuilder[] | null {
  const json = typeof document === 'undefined' ? null : document.getElementById('rebuilder-community-builders')?.textContent;
  if (!json) return null;
  try {
    const list: unknown = JSON.parse(json);
    return Array.isArray(list) ? (list as CommunityBuilder[]) : null;
  } catch {
    return null;
  }
}
