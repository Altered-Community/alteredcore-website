// Writes ../dist/embed-manifest.json after `ng build --stats-json`: the files the
// AlteredCore shell loads (see includes/spa.php in the site). The polyfills and main modules have hashed names;
// the non-injected style bundles do not, so they get a content hash as query string.
//
// `preload`: the modules each page needs before it can draw, which the shell announces in <head>
// (<link rel="modulepreload">). Without it the browser discovers them one level at a time (main → bootstrap →
// shared chunks → route component → its chunks), one round trip per level. Read from esbuild's metafile
// (../dist/stats.json), removed afterwards: it is not served.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/**
 * Page slugs of the site (the shell's `slug`, see plugin.json `beta_slugs`) → the route component they open
 * (embed.routes.ts, legacy-url.serializer.ts). `*`: every page (the bootstrap module and what it imports).
 */
const PRELOAD_ENTRIES = {
  '*': 'src/app/embed/bootstrap.ts',
  decks: 'src/app/features/decks/decks-page/decks.page.ts',
  deck: 'src/app/features/deck/deck-page/deck.page.ts',
  deckbuilder: 'src/app/features/editor/editor-page/editor.page.ts',
  // English interface: its translations, loaded before the app (main.ts).
  'lang:en': 'src/locale/messages.en.json',
};

function preloads() {
  const statsFile = join(dist, 'stats.json');
  if (!existsSync(statsFile)) throw new Error('embed-manifest: ../dist/stats.json missing (ng build --stats-json)');
  const { outputs } = JSON.parse(readFileSync(statsFile, 'utf8'));
  rmSync(statsFile);
  const name = (path) => path.replace(/^.*\//, '');
  const byEntry = new Map(Object.entries(outputs).filter(([, o]) => o.entryPoint).map(([path, o]) => [o.entryPoint, name(path)]));
  const imports = new Map(
    Object.entries(outputs).map(([path, o]) => [name(path), (o.imports ?? []).filter((i) => i.kind === 'import-statement').map((i) => name(i.path))]),
  );
  const initial = new Set([one(/^main-[A-Za-z0-9_-]+\.js$/), one(/^polyfills-[A-Za-z0-9_-]+\.js$/)]);
  // A module, then everything it imports statically, depth first: dependencies before their importers.
  const closure = (file, seen) => {
    if (seen.has(file) || initial.has(file)) return [];
    seen.add(file);
    return [...(imports.get(file) ?? []).flatMap((dep) => closure(dep, seen)), file];
  };
  const common = new Set();
  const out = {};
  for (const [key, entry] of Object.entries(PRELOAD_ENTRIES)) {
    const file = byEntry.get(entry);
    if (!file) throw new Error(`embed-manifest: no output chunk for ${entry}`);
    // The pages' lists leave out what `*` preloads already.
    const list = closure(file, key === '*' ? common : new Set(common));
    for (const f of list) if (!files.includes(f)) throw new Error(`embed-manifest: ${f} not in ${browser}`);
    out[key] = list;
  }
  return out;
}

const manifest = {
  version: 1,
  base: 'browser/',
  // Module scripts run in document order: the polyfills ($localize) before the app.
  js: [one(/^polyfills-[A-Za-z0-9_-]+\.js$/), one(/^main-[A-Za-z0-9_-]+\.js$/)],
  css: [versioned(one(/^embed\.css$/))],
  documentCss: [versioned(one(/^document\.css$/))],
  preload: preloads(),
};
writeFileSync(join(dist, 'embed-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`embed-manifest: ${JSON.stringify(manifest)}`);
