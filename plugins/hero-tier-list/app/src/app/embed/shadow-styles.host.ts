import { Injectable, inject } from '@angular/core';
import { ɵSharedStylesHost as SharedStylesHost } from '@angular/platform-browser';
import { EMBED_MOUNT } from './host';

/**
 * Keeps every component style inside the plugin's shadow root. Angular already targets the
 * shadow root for the app root, but components created before they are attached (CDK dialog
 * panes) resolve to `document.head`, which would then receive a copy of all the styles.
 * Private Angular API (`ɵSharedStylesHost`), checked by the embed e2e test. `@Injectable` rather than
 * `@Service`: the base class takes its dependencies through its constructor.
 */
@Injectable()
export class ShadowStylesHost extends SharedStylesHost {
  private readonly mount = inject(EMBED_MOUNT);

  override addHost(hostNode: Node): void {
    const shadow = this.mount.root instanceof ShadowRoot ? this.mount.root : null;
    super.addHost(shadow && hostNode === this.mount.host.ownerDocument.head ? shadow : hostNode);
  }
}
