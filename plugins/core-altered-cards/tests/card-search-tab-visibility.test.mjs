import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// Verify tab-visibility CSS precedence (.d-flex !important) and Uniques sort behavior.
function makeStyle() {
  const props = {};
  return {
    get display() { return props.display?.value || ''; },
    set display(v) {
      if (v === '' || v == null) delete props.display;
      else props.display = { value: String(v), priority: '' };
    },
    setProperty(name, value, priority = '') {
      props[name] = { value: String(value), priority: String(priority) };
    },
    removeProperty(name) {
      delete props[name];
    },
    _prop(name) { return props[name] || null; },
  };
}

function makeEl(id, tag = 'div', attrs = {}) {
  const listeners = {};
  const classes = new Set();
  const attributes = Object.assign({}, attrs);
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    disabled: false,
    checked: false,
    style: makeStyle(),
    dataset: {},
    selectedOptions: [],
    options: [],
    children: [],
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c); else classes.add(c);
        } else if (force) classes.add(c);
        else classes.delete(c);
      },
    },
    attributes,
    getAttribute(k) { return attributes[k] ?? null; },
    setAttribute(k, v) { attributes[k] = String(v); },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, eventObj = {}) {
      for (const fn of listeners[type] || []) fn.call(this, Object.assign({ target: eventObj.target || this, preventDefault() {} }, eventObj));
    },
    closest() { return null; },
    contains() { return true; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
  };
}

function loadCardSearch() {
  const src = fs.readFileSync(path.join(process.cwd(), 'plugins/core-altered-cards/assets/card-search.js'), 'utf8');
  return vm.runInThisContext(`(function(){ ${src}\nreturn CardSearch; })()`);
}

function setup({ search = '', sort = 'default' } = {}) {
  const byId = new Map();
  const pushedUrls = [];
  const fetchUrls = [];
  const root = makeEl('cs-panel');
  const sortWrap = makeEl('sort-wrap', 'div', { 'data-tabs': 'all unique collection ownership' });
  const hneWrap = makeEl('hne-wrap', 'label', { 'data-tabs': 'all unique' });
  const keywordWrap = makeEl('keyword-wrap', 'div', { 'data-tabs': 'all' });
  const dataTabsEls = [sortWrap, hneWrap, keywordWrap];

  const randomOpt = { hidden: false, disabled: false };
  const sortSelect = makeEl('cs-sort', 'select');
  sortSelect.value = sort;
  sortSelect.querySelector = (sel) => (sel === 'option[value="random"]' ? randomOpt : null);
  byId.set('cs-panel', root);
  byId.set('cs-sort', sortSelect);

  const tabButtons = ['all', 'unique', 'collection'].map((tab) => {
    const b = makeEl(`tab-${tab}`, 'button');
    b.dataset.tab = tab;
    return b;
  });

  root.querySelectorAll = (sel) => {
    if (sel === '[data-tabs]') return dataTabsEls;
    if (sel === '.cs-tab[data-tab]') return tabButtons;
    if (sel.startsWith('.cs-tab[data-tab=')) {
      const m = sel.match(/data-tab="([^"]+)"/);
      return tabButtons.filter((b) => b.dataset.tab === m[1]);
    }
    return [];
  };

  globalThis.location = { pathname: '/pages/cards', search };
  globalThis.history = { pushState(_s, _t, url) { pushedUrls.push(url); } };
  globalThis.window = globalThis;
  globalThis.window.addEventListener = () => {};
  globalThis.document = {
    getElementById(id) { return byId.get(id) || null; },
    addEventListener() {},
  };
  globalThis.fetch = (url) => {
    fetchUrls.push(url);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ member: [], totalItems: 0, iter: { total: 0 }, cards: [] }),
    });
  };

  return { root, sortWrap, hneWrap, keywordWrap, sortSelect, randomOpt, tabButtons, pushedUrls, fetchUrls };
}

const CardSearch = loadCardSearch();

let pass = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ok   - ' + msg); }
  else { console.log('  FAIL - ' + msg); process.exitCode = 1; }
}

// 1. Direct URL load on tab=unique&sort=mana_asc keeps sort visible, hides random, and sends sort=mainCost:asc
{
  const env = setup({ search: '?tab=unique&sort=mana_asc', sort: 'mana_asc' });
  const cs = CardSearch({
    prefix: 'cs',
    mode: 'cards',
    pushState: true,
    uniquesApiBase: 'http://localhost:8005',
    initial: { sort: 'mana_asc' },
  });
  ok(env.sortWrap.style._prop('display') === null,
    'sort wrapper visible on unique tab');
  ok(env.hneWrap.style._prop('display') === null, 'hasNoEffect wrapper visible on unique tab');
  ok(env.keywordWrap.style._prop('display')?.value === 'none' && env.keywordWrap.style._prop('display')?.priority === 'important',
    'keyword wrapper hidden with display:none !important on unique tab');
  ok(cs.filters.sort === 'mana_asc', 'filters.sort preserved as mana_asc on unique tab');
  ok(env.sortSelect.value === 'mana_asc', 'sort select value preserved as mana_asc on unique tab');
  ok(env.randomOpt.hidden === true && env.randomOpt.disabled === true, 'random sort option hidden and disabled on unique tab');
  cs.search(1);
  ok(env.pushedUrls.length === 1 && env.pushedUrls[0].includes('sort=mana_asc'), 'search URL preserves sort on unique tab');
  ok(env.fetchUrls.length === 1 && env.fetchUrls[0].includes('sort=mainCost%3Aasc'), 'uniques API fetch sends sort=mainCost:asc');

  // Direct URL load on tab=unique&sort=random falls back to default
  const randEnv = setup({ search: '?tab=unique&sort=random', sort: 'random' });
  const randCs = CardSearch({
    prefix: 'cs',
    mode: 'cards',
    pushState: true,
    uniquesApiBase: 'http://localhost:8005',
    initial: { sort: 'random' },
  });
  ok(randCs.filters.sort === 'default', 'random sort reset to default on unique tab');
  ok(randEnv.sortSelect.value === 'default', 'sort select value reset to default when random requested on unique tab');
  randCs.search(1);
  ok(randEnv.pushedUrls.length === 1 && !randEnv.pushedUrls[0].includes('sort='), 'search URL omits sort when random was reset on unique tab');

  // Switching back to all restores display property and random sort option
  const allBtn = env.tabButtons.find((b) => b.dataset.tab === 'all');
  env.root.dispatch('click', { target: { closest: (s) => (s === '.cs-tab[data-tab]' ? allBtn : null) } });
  ok(env.sortWrap.style._prop('display') === null, 'sort wrapper display cleared when switching back to all tab');
  ok(env.keywordWrap.style._prop('display') === null, 'keyword display cleared when switching back to all tab');
  ok(env.sortSelect.disabled === false, 'sort select enabled on all tab');
  ok(env.randomOpt.hidden === false && env.randomOpt.disabled === false, 'random sort option re-enabled on all tab');
}

// 2. Collection tab keeps sort wrapper visible (disabled) and resets sort
{
  const env = setup();
  const cs = CardSearch({
    prefix: 'cs',
    mode: 'cards',
    collApiUrl: '/papi/core-altered-cards/collection-search',
  });
  const collBtn = env.tabButtons.find((b) => b.dataset.tab === 'collection');
  env.root.dispatch('click', { target: { closest: (s) => (s === '.cs-tab[data-tab]' ? collBtn : null) } });
  ok(env.sortWrap.style._prop('display') === null, 'sort wrapper visible on collection tab');
  ok(env.sortSelect.disabled === true, 'sort select disabled on collection tab');
  ok(cs.filters.sort === 'default', 'filters.sort reset to default on collection tab');
}

console.log(`\n${pass} passed`);
