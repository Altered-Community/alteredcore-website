import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, ɵSHARED_STYLES_HOST as SHARED_STYLES_HOST } from '@angular/core';
import { RouteReuseStrategy, TitleStrategy, provideRouter } from '@angular/router';
import { AuthSession } from '../core/auth-session';
import { DeckCreateFailurePrompt } from '../core/deck-create-failure';
import { DecksListReuseStrategy } from '../features/decks/decks-list-reuse';
import { OverlayDeckCreateFailurePrompt } from '../features/shared/create-deck-failed/create-deck-failed.overlay';
import { AR_DENSITY_TARGET } from '../ui/layout.services';
import { embedRoutes } from './embed.routes';
import { EmbedTitleStrategy } from './embed-title.strategy';
import { ALTERED_CORE, EMBED_MOUNT, type AlteredCoreHost, type AlteredCoreMount } from './host';
import { HostAuthSession } from './host-auth.session';
import { siteCsrfInterceptor } from './site-csrf.interceptor';
import { ShadowOverlayContainer } from './shadow-overlay-container';
import { ShadowStylesHost } from './shadow-styles.host';

export function embedConfig(host: AlteredCoreHost, mount: AlteredCoreMount): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: ALTERED_CORE, useValue: host },
      { provide: EMBED_MOUNT, useValue: mount },
      { provide: APP_BASE_HREF, useValue: host.page.basePath },
      { provide: RouteReuseStrategy, useClass: DecksListReuseStrategy },
      provideRouter(embedRoutes),
      { provide: TitleStrategy, useClass: EmbedTitleStrategy },
      provideHttpClient(withFetch(), withInterceptors([siteCsrfInterceptor])),
      { provide: AuthSession, useClass: HostAuthSession },
      { provide: DeckCreateFailurePrompt, useClass: OverlayDeckCreateFailurePrompt },
      { provide: OverlayContainer, useClass: ShadowOverlayContainer },
      { provide: AR_DENSITY_TARGET, useValue: mount.container },
      { provide: SHARED_STYLES_HOST, useClass: ShadowStylesHost },
    ],
  };
}
