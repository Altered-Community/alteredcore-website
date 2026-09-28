// Writes ../dist/embed-manifest.json after `ng build --configuration embed`: the files the
// AlteredCore shell loads (see includes/spa.php in the site). The main module has a hashed name;
// the non-injected style bundles do not, so they get a content hash as query string.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
const browser = join(dist, 'browser');
const files = readdirSync(browser);

function one(re) {
  const found = files.filter((f) => re.test(f));
  if (found.length !== 1) throw new Error(`embed-manifest: expected one file matching ${re} in ${browser}, found ${found.length}`);
  return found[0];
}

function versioned(file) {
  const hash = createHash('sha256').update(readFileSync(join(browser, file))).digest('hex').slice(0, 12);
  return `${file}?v=${hash}`;
}

const manifest = {
  version: 1,
  base: 'browser/',
  js: [one(/^main-[A-Za-z0-9_-]+\.js$/)],
  css: [versioned(one(/^embed\.css$/))],
  documentCss: [versioned(one(/^document\.css$/))],
};
writeFileSync(join(dist, 'embed-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`embed-manifest: ${JSON.stringify(manifest)}`);
