import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const CardSearchQuery = require(path.join(ROOT, 'plugins/core-altered-cards/assets/card-search-query.js'));
const CardSearchEffects = require(path.join(ROOT, 'plugins/core-altered-cards/assets/card-search-effects.js'));

const alteredData = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins/core-altered-cards/data/altered.json'), 'utf8'));
const searchSettings = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins/core-altered-cards/data/search_settings.json'), 'utf8'));
const rebuilderVocabSrc = fs.readFileSync(path.join(ROOT, 'plugins/rebuilder/app/src/app/core/card-vocabulary.ts'), 'utf8');
const rebuilderFiltersSrc = fs.readFileSync(path.join(ROOT, 'plugins/rebuilder/app/src/app/core/card-filters.ts'), 'utf8');
const rebuilderCardSearchSrc = fs.readFileSync(path.join(ROOT, 'plugins/rebuilder/app/src/app/features/search/card-search/card-search.ts'), 'utf8');

let pass = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ok   - ' + msg); }
  else { console.log('  FAIL - ' + msg); process.exitCode = 1; }
}
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  ok(sa === sb, `${msg} (got ${sa}, want ${sb})`);
}

// 1. Promo editions catalog stays synchronized between standard altered.json and beta card-vocabulary.ts
{
  const stdPromos = Object.entries(alteredData.sets)
    .filter(([, s]) => s.subtype === 'sub')
    .map(([code, s]) => ({ code, parent: s.parent }));
  const betaPromos = [...rebuilderVocabSrc.matchAll(/\{\s*code:\s*"([^"]+)",\s*parent:\s*"([^"]+)"/g)].map((m) => ({
    code: m[1],
    parent: m[2],
  }));
  eq(betaPromos, stdPromos, 'beta PROMO_SETS matches standard altered.json sub-editions and parents');
}

// 2. Default rarities & main sets align between search_settings.json and beta card-filters.ts
{
  const stdMainSets = Object.entries(alteredData.sets)
    .filter(([, s]) => s.subtype === 'main')
    .map(([code]) => code)
    .sort();
  const betaSetsMatch = rebuilderFiltersSrc.match(/ALL_CARDS_SETS\s*=\s*\[([^\]]+)\]/);
  const betaMainSets = betaSetsMatch ? [...betaSetsMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : [];
  eq(betaMainSets, stdMainSets, 'beta ALL_CARDS_SETS matches standard altered.json main sets');
  eq(searchSettings.default_rarities, ['COMMON', 'RARE', 'EXALTED'], 'standard default rarities are C, R, E (U off by default)');
}

// 3. Tab order matches standard card-search.php (all -> collection -> owned -> favorites)
{
  const tabIds = [...rebuilderCardSearchSrc.match(/CARD_SOURCES:[\s\S]*?\];/)[0].matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  eq(tabIds, ['all', 'collection', 'owned', 'favorites'], 'beta CARD_SOURCES follows standard tab order (all, collection, owned, favorites)');
}

// 4. Effect sorting tiers: Character (0) -> Spell (1) -> rest (2), matching Re:Builder's effectTypeRank
{
  const sample = [
    { alteredId: 1, translations: { fr_FR: 'Alpha repère' }, cardTypes: ['LANDMARK_PERMANENT'] },
    { alteredId: 2, translations: { fr_FR: 'Zebra sort' }, cardTypes: ['SPELL'], spellOnly: true },
    { alteredId: 3, translations: { fr_FR: 'Alpha sort' }, cardTypes: ['SPELL'], spellOnly: true },
    { alteredId: 4, translations: { fr_FR: 'Zebra perso' }, cardTypes: ['CHARACTER'] },
    { alteredId: 5, translations: { fr_FR: 'Beta mixte' }, cardTypes: ['CHARACTER', 'SPELL'] },
    { alteredId: 6, translations: { fr_FR: 'Beta héros' }, cardTypes: ['HERO'] },
  ];
  eq(sample.map((s) => CardSearchEffects.effectTypeRank(s)), [2, 1, 1, 0, 0, 2], 'standard effectTypeRank assigns 0=Character, 1=Spell, 2=rest');
  const ctrl = CardSearchEffects({ prefix: 'cs', apiBase: '', lang: 'fr', pickLocale: (t) => t.fr_FR || '' });
  eq(
    sample.slice().sort(ctrl.compareItems).map((s) => s.translations.fr_FR),
    ['Beta mixte', 'Zebra perso', 'Alpha sort', 'Zebra sort', 'Alpha repère', 'Beta héros'],
    'standard effect sort order matches beta Character -> Spell -> rest',
  );
}

// 5. Guest URL fallback & TOKEN expansion parity in Standard CardSearchQuery
{
  const defaults = { factions: [], types: [], rarities: ['COMMON', 'RARE', 'EXALTED'], sets: ['CORE'], variations: ['standard'] };
  const guestCfg = { collApiUrl: '', ownershipApiUrl: '', favApiUrl: '', playsetApiUrl: '' };
  for (const tab of ['collection', 'ownership', 'favoris']) {
    eq(CardSearchQuery.parseUrlState(`?tab=${tab}`, guestCfg, defaults).resolvedTab, 'all', `standard guest ?tab=${tab} falls back to all`);
  }
  eq(
    CardSearchQuery.expandTypes(['TOKEN', 'TOKEN_MANA'], alteredData.types_merged),
    ['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA'],
    'standard TOKEN + TOKEN_MANA expansion matches beta cardTypeCodes([TOKEN])',
  );
}

console.log(`\n${pass} passed`);
