import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable, inject } from '@angular/core';
import { EMBED_MOUNT } from './host';

/**
 * CDK overlays (dialogs, sheets, menus) render in the plugin's shadow root instead of
 * `document.body`: the plugin styles apply to them and the site's Bootstrap does not.
 */
@Injectable()
export class ShadowOverlayContainer extends OverlayContainer {
  private readonly mount = inject(EMBED_MOUNT);

  protected override _createContainer(): void {
    const container = this._document.createElement('div');
    container.classList.add('cdk-overlay-container');
    this.mount.container.appendChild(container);
    this._containerElement = container;
  }
}
