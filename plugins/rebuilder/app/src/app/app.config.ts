import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, RouteReuseStrategy, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { DecksListReuseStrategy } from './features/decks/decks-list-reuse';
import { SiteNavPreloading } from './site-nav-preloading';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: RouteReuseStrategy, useClass: DecksListReuseStrategy },
    provideRouter(routes, withPreloading(SiteNavPreloading)),
    provideHttpClient(withFetch()),
  ],
};
