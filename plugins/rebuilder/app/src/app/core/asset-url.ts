let base = '';

/**
 * URL of a file from `public/` (`assets/…`). The standalone app serves them from its own root,
 * so the path stays relative. Embedded in the AlteredCore site, the page URL is the site's
 * (`/pages/deckbuilder/…`), so files come from the plugin's build directory instead.
 */
export function assetUrl(path: string): string {
  return base + path;
}

/** Set once at startup, before the app modules load (`main.embed.ts`). */
export function setAssetBase(url: string): void {
  base = url && !url.endsWith('/') ? `${url}/` : url;
}
