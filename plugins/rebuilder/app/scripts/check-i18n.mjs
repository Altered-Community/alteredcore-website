// Checks src/locale/messages.en.json against the messages extracted from the sources
// (`ng extract-i18n` → ../dist/i18n/messages.json, French): every message has a custom `@@id`
// and an English translation with the same placeholders, and no translation is left unused.
// A missing translation would silently fall back to French at runtime.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(join(root, '..', 'dist', 'i18n', 'messages.json'), 'utf8')).translations;
const en = JSON.parse(readFileSync(join(root, 'src', 'locale', 'messages.en.json'), 'utf8')).translations;

const placeholders = (text) => [...text.matchAll(/\{\$([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort().join(',');
const errors = [];

for (const [id, text] of Object.entries(source)) {
  if (!/[a-zA-Z]/.test(id)) errors.push(`no custom id (i18n="@@area.key", $localize\`:@@area.key:…\`): « ${text} »`);
  else if (!(id in en)) errors.push(`${id}: no English translation (« ${text} »)`);
  else if (placeholders(text) !== placeholders(en[id])) errors.push(`${id}: placeholders differ (« ${text} » / « ${en[id]} »)`);
}
for (const id of Object.keys(en)) {
  if (!(id in source)) errors.push(`${id}: translation of a message that no longer exists`);
}

if (errors.length) {
  console.error(`i18n: ${errors.length} problem(s) in src/locale/messages.en.json\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n: ${Object.keys(source).length} messages, all translated`);
