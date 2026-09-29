let base = '';

/**
 * URL of a file from `public/` (`assets/…`). The page URL is the site's (`/pages/rebuilder/…`),
 * so files come from the plugin's build directory (`AlteredCore.page.assetsUrl`).
 */
export function assetUrl(path: string): string {
  return base + path;
}

/** Set once at startup, before the app modules load (`main.ts`). */
export function setAssetBase(url: string): void {
  base = url && !url.endsWith('/') ? `${url}/` : url;
}
