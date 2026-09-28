import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, ɵSHARED_STYLES_HOST as SHARED_STYLES_HOST } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { AuthSession } from '../core/auth-session';
import { DECK_CREATE_TARGET } from '../core/deck-store';
import { AR_DENSITY_TARGET } from '../ui/layout.services';
import { embedRoutes } from './embed.routes';
import { EmbedTitleStrategy } from './embed-title.strategy';
import { ALTERED_CORE, EMBED_MOUNT, type AlteredCoreHost, type AlteredCoreMount } from './host';
import { HostAuthSession } from './host-auth.session';
import { ShadowOverlayContainer } from './shadow-overlay-container';
import { ShadowStylesHost } from './shadow-styles.host';

export function embedConfig(host: AlteredCoreHost, mount: AlteredCoreMount): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: ALTERED_CORE, useValue: host },
      { provide: EMBED_MOUNT, useValue: mount },
      { provide: APP_BASE_HREF, useValue: host.page.basePath },
      provideRouter(embedRoutes),
      { provide: TitleStrategy, useClass: EmbedTitleStrategy },
      provideHttpClient(withFetch()),
      { provide: AuthSession, useClass: HostAuthSession },
      { provide: DECK_CREATE_TARGET, useValue: 'account' },
      { provide: OverlayContainer, useClass: ShadowOverlayContainer },
      { provide: AR_DENSITY_TARGET, useValue: mount.container },
      { provide: SHARED_STYLES_HOST, useClass: ShadowStylesHost },
    ],
  };
}
