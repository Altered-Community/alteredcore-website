// Discover page: contents disclosure (narrow screens) and highlight of the section being read.
(function () {
  'use strict';

  var toc = document.getElementById('discover-toc');
  if (!toc) return;

  var toggle = toc.querySelector('.discover-toc__toggle');
  var links = Array.prototype.slice.call(toc.querySelectorAll('.ac-toc__list a'));

  if (toggle) {
    toggle.addEventListener('click', function () {
      toggle.setAttribute('aria-expanded', toggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
    // Picking a section closes the disclosure
    links.forEach(function (a) {
      a.addEventListener('click', function () { toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  function setCurrent(id) {
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  // The current section is the first one crossing the band between 25% and 40% from the top.
  var visible = {};
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    for (var i = 0; i < sections.length; i++) {
      if (visible[sections[i].id]) { setCurrent(sections[i].id); return; }
    }
  }, { rootMargin: '-25% 0px -60% 0px' });
  sections.forEach(function (s) { observer.observe(s); });
})();

// Gameplay loop: lights up the phase of the Day the video is showing; still image under reduced motion.
(function () {
  'use strict';

  var video = document.querySelector('.discover-visual__video');
  if (!video) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay');
    video.pause();
    video.controls = false;
    return;
  }

  // data-phases="afternoon:0,dusk:12,night:18": where each phase starts, in seconds
  var marks = (video.getAttribute('data-phases') || '').split(',').map(function (m) {
    var p = m.split(':');
    return { key: p[0], at: parseFloat(p[1]) };
  }).filter(function (m) { return m.key && !isNaN(m.at); });
  var items = {};
  Array.prototype.forEach.call(document.querySelectorAll('.discover-day__item[data-phase]'), function (li) {
    items[li.getAttribute('data-phase')] = li;
  });

  // data-cues="0,2,10,...": where each caption starts, in seconds (the captions are the list items after the video)
  var cues = document.querySelector('.discover-visual__cues');
  var starts = (video.getAttribute('data-cues') || '').split(',').map(parseFloat);
  var lines = cues ? Array.prototype.slice.call(cues.children) : [];
  if (lines.length) cues.classList.add('is-live');
  var line = -1;

  var current = null;
  var holding = false; // the hold on the first frame: no caption, no phase lit yet
  function update() {
    if (holding) return;
    var n = -1;
    for (var j = 0; j < starts.length; j++) if (video.currentTime >= starts[j]) n = j;
    if (n !== line) {
      if (lines[line]) lines[line].removeAttribute('data-active');
      if (lines[n]) lines[n].setAttribute('data-active', '');
      // The same caption beside the video, under its phase (shown on wide screens only)
      Array.prototype.forEach.call(document.querySelectorAll('.discover-day__cue'), function (c) {
        if (parseInt(c.getAttribute('data-cue'), 10) === n + 1) c.setAttribute('data-active', '');
        else c.removeAttribute('data-active');
      });
      line = n;
    }
    var key = null;
    for (var i = 0; i < marks.length; i++) if (video.currentTime >= marks[i].at) key = marks[i].key;
    if (key === current) return;
    if (current && items[current]) items[current].removeAttribute('aria-current');
    if (key && items[key]) items[key].setAttribute('aria-current', 'step');
    current = key;
  }
  video.addEventListener('timeupdate', update);

  // Slower than the capture and a hold on the first and last frames, so the captions can be read.
  // Without the script the video simply loops (the loop attribute).
  var rate = parseFloat(video.getAttribute('data-rate')) || 1;
  var holdStart = (parseFloat(video.getAttribute('data-hold-start')) || 0) * 1000;
  var holdEnd = (parseFloat(video.getAttribute('data-hold-end')) || 0) * 1000;
  var timer = null;
  video.loop = false;
  video.playbackRate = rate;
  function clear() {
    if (current && items[current]) items[current].removeAttribute('aria-current');
    if (lines[line]) lines[line].removeAttribute('data-active');
    Array.prototype.forEach.call(document.querySelectorAll('.discover-day__cue'), function (c) { c.removeAttribute('data-active'); });
    current = null;
    line = -1;
  }
  function restart() {
    holding = true;
    video.currentTime = 0;
    clear();
    clearTimeout(timer);
    timer = setTimeout(function () {
      holding = false;
      update();
      video.playbackRate = rate;
      video.play();
    }, holdStart);
  }
  video.addEventListener('ended', function () {
    clearTimeout(timer);
    timer = setTimeout(restart, holdEnd);
  });
  // The first pass starts with the same hold
  video.pause();
  restart();
})();

// The world: faction picker (tabs, #world-<faction> hash) and the two illustrations of each faction, from the cards API:
// a Hero in its standard version, and any other card that is not a Hero, a Token or a Unique. Credits are always shown.
(function () {
  'use strict';

  var root = document.getElementById('discover-world');
  if (!root) return;

  var API = (root.getAttribute('data-api') || '').replace(/\/$/, '');
  var CDN = (root.getAttribute('data-cdn') || '').replace(/\/$/, '');
  var LOCALE = root.getAttribute('data-locale') || 'en';
  var CREDIT = root.getAttribute('data-credit') || '';
  var CURATED = { heros: {}, cards: {} };
  try { CURATED = JSON.parse(root.getAttribute('data-curated')) || CURATED; } catch (e) { /* no curated list: random cards */ }
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = {};
  Array.prototype.forEach.call(root.querySelectorAll('[role="tabpanel"]'), function (p) { panels[p.getAttribute('data-faction')] = p; });

  // ---- Tabs ----
  var current = '';
  function select(slug, focus) {
    if (!panels[slug]) return;
    var changed = slug !== current;
    current = slug;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-faction') === slug;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== slug; });
    if (changed) { load(slug); restart(); }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      select(t.getAttribute('data-faction'));
      history.replaceState(null, '', '#world-' + t.getAttribute('data-faction'));
    });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') d = -i;
      if (e.key === 'End') d = tabs.length - 1 - i;
      if (!d) return;
      e.preventDefault();
      var n = tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-faction');
      select(n, true);
      history.replaceState(null, '', '#world-' + n);
    });
  });

  // A faction can be linked to directly: #world-axiom selects it and scrolls to the section.
  function fromHash(scroll) {
    var m = /^#world-([a-z]+)$/.exec(location.hash);
    if (!m || !panels[m[1]]) return;
    select(m[1]);
    if (scroll) document.getElementById('world').scrollIntoView();
  }
  window.addEventListener('hashchange', function () { fromHash(true); });

  // ---- Illustrations ----
  var TYPES = ['CHARACTER', 'SPELL', 'PERMANENT', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT'];
  var RARITIES = ['COMMON', 'RARE', 'EXALTED'];   // never UNIQUE
  var pending = {};

  function url(code, extra) {
    return API + '/api/cards?locale=' + LOCALE + '&page=1&faction.code[]=' + code + '&variation[]=standard&' + extra;
  }
  function usable(c, code) {
    return c && c.reference && c.faction && c.faction.code === code && c.artists && c.artists.length && c.artists[0].name;
  }
  function fetchList(u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { return d.member || []; });
  }
  function pick(list) { return list.length ? list[Math.floor(Math.random() * list.length)] : null; }

  // Heroes: the cards API is slow on a type filter (30 s or more) but answers an exact reference in well under a second.
  // The standard Hero cards of the core set are ALT_CORE_B_<faction>_01_C to _03_C, three per faction: fetch the three,
  // keep those with an artist and an effect. The other card: one request in random order, pick here.
  function hero(code) {
    return Promise.all(['01', '02', '03'].map(function (n) {
      return fetchList(API + '/api/cards?locale=' + LOCALE + '&reference=ALT_CORE_B_' + code + '_' + n + '_C')
        .then(function (l) { return l[0]; }, function () { return null; });
    })).then(function (l) {
      return l.filter(function (c) { return usable(c, code) && c.cardType && c.cardType.reference === 'HERO' && c.mainEffect; });
    });
  }
  // Carousel order: each list is shuffled once per page load, then walked in a loop (the same card never repeats
  // before the others have been shown).
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function queue(list) { return { list: shuffle(list), i: 0 }; }
  function next(q) { var v = q.list[q.i % q.list.length]; q.i++; return v; }
  var queues = {};

  // Swap an image for another one without a jump: load the new one off screen, fade out, swap, fade in.
  function swap(img, src, apply) {
    if (img.getAttribute('src') === src) return;
    var pre = new Image();
    pre.onload = function () {
      img.classList.add('is-changing');
      setTimeout(function () {
        img.onload = function () { img.classList.remove('is-changing'); };
        apply();
        img.src = src;
      }, 300);
    };
    pre.src = src;
  }

  // Curated lists (world-cards.yaml): a reference fetched by exact reference (fast), fetched by exact reference (fast).
  var byRef = {};
  function curated(ref, code) {
    if (!ref) return Promise.resolve(null);
    if (!byRef[ref]) byRef[ref] = fetchList(API + '/api/cards?locale=' + LOCALE + '&reference=' + ref)
      .then(function (l) { return usable(l[0], code) ? l[0] : null; }, function () { delete byRef[ref]; return null; });
    return byRef[ref];
  }
  function candidates(code) {
    if (!pending[code]) {
      var others = fetchList(url(code, 'itemsPerPage=40&random=true&' + TYPES.map(function (t) { return 'cardType[]=' + t; }).concat(RARITIES.map(function (r) { return 'rarity[]=' + r; })).join('&')))
        .then(function (l) {
          return l.filter(function (c) {
            return usable(c, code) && c.cardType && TYPES.indexOf(c.cardType.reference) >= 0 && c.rarity && c.rarity.reference !== 'UNIQUE';
          });
        });
      pending[code] = Promise.all([hero(code), others]).then(function (r) { return { heroes: r[0], cards: r[1] }; });
    }
    return pending[code];
  }

  function draw(figure, card) {
    if (!card) { figure.hidden = true; return; }
    figure.hidden = false;
    var img = figure.querySelector('img');
    var frame = figure.querySelector('.discover-art__frame');
    var credit = figure.querySelector('figcaption');
    // The site's card image CDN (as the cards page), not the API's imagePath, which points at a dev S3 bucket.
    var src = CDN + '/cards/' + LOCALE + '/' + card.reference.split('_')[1] + '/' + card.reference + '.webp';
    function apply() {
      img.alt = card.name || '';
      credit.textContent = CREDIT.replace('{artist}', card.artists[0].name);
    }
    if (frame.classList.contains('is-loaded')) { swap(img, src, apply); return; }
    // First image of this slot: the skeleton stays until it has loaded.
    img.hidden = true;
    img.onload = function () { frame.classList.add('is-loaded'); img.hidden = false; };
    apply();
    img.src = src;
  }

  // Introduction tab: key art of a set, the next one of a shuffled loop each time.
  function setArt(panel) {
    var fig = panel.querySelector('.discover-set');
    if (!fig) return;
    var list;
    try { list = JSON.parse(fig.getAttribute('data-images')); } catch (e) { return; }
    if (!list.length) return;
    var q = queues.intro || (queues.intro = queue(list));
    var s = next(q);
    var img = fig.querySelector('img');
    swap(img, s.src, function () {
      img.alt = (fig.getAttribute('data-alt') || '{set}').replace('{set}', s.name);
      fig.querySelector('figcaption').textContent = s.name;
    });
  }

  // One slot (hero or card) of a faction goes on to its next illustration.
  function advance(slug, slot) {
    var panel = panels[slug], code = panel.getAttribute('data-code'), q = queues[slug];
    var figure = panel.querySelector('[data-slot="' + slot + '"]');
    var card = (q && q[slot])
      ? curated(next(q[slot]), code)
      : candidates(code).then(function (r) { return pick(slot === 'hero' ? r.heroes : r.cards); });
    card.then(function (c) { if (c) draw(figure, c); }).catch(function () {});
  }

  // The candidates are fetched once per faction; a new pair is drawn each time the faction is shown,
  // so leaving a faction and coming back shows other cards.
  function load(slug) {
    var panel = panels[slug];
    if (slug === 'intro') { setArt(panel); return; }
    var art = panel.querySelector('.discover-faction__art');
    var code = panel.getAttribute('data-code');
    var h = CURATED.heros[code], c = CURATED.cards[code];
    var q = queues[slug] || (queues[slug] = (h && h.length && c && c.length) ? { hero: queue(h), card: queue(c) } : {});
    // A faction missing from the file keeps the old behaviour: random cards from the API.
    var pair = (h && h.length && c && c.length)
      ? Promise.all([curated(next(q.hero), code), curated(next(q.card), code)])
      : candidates(code).then(function (r) { return [pick(r.heroes), pick(r.cards)]; });
    pair.then(function (r) {
      var hero = r[0], card = r[1];
      draw(panel.querySelector('[data-slot="hero"]'), hero);
      draw(panel.querySelector('[data-slot="card"]'), card);
      art.classList.toggle('is-empty', !hero && !card);
    }).catch(function () {
      delete pending[panel.getAttribute('data-code')];
      art.classList.add('is-empty');
    });
  }

  // Carousel: the key art of the introduction changes every 5 seconds. On a faction, each card changes every 6 seconds,
  // the other card (the Hero) 3 seconds later, so the two never change together. It stands still while the pointer is
  // over the illustrations, when the page is in the background, and for visitors who asked for less motion.
  var STEP = 6000;
  var still = false;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];
  function every(ms, delay, fn) {
    var t = setTimeout(function () {
      fn();
      timers.push(setInterval(fn, ms));
    }, delay);
    timers.push(t);
  }
  function restart() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
    if (calm || !current) return;
    var go = function (fn) { return function () { if (!still && !document.hidden) fn(); }; };
    if (current === 'intro') { every(5000, 5000, go(function () { setArt(panels.intro); })); return; }
    every(STEP, STEP, go(function () { advance(current, 'card'); }));
    every(STEP, STEP / 2, go(function () { advance(current, 'hero'); }));
  }
  Array.prototype.forEach.call(root.querySelectorAll('.discover-faction__art, .discover-set'), function (el) {
    el.addEventListener('mouseenter', function () { still = true; });
    el.addEventListener('mouseleave', function () { still = false; restart(); });
  });
  restart();

  fromHash(true);
  // No hash: the faction selected in the HTML (the first one)
  if (!current && tabs.length) select((document.querySelector('#discover-world [role="tab"][aria-selected="true"]') || tabs[0]).getAttribute('data-faction'));
})();

// Formats picker (section 4): same tab pattern as the factions; the format is kept in the URL hash (#decks-standard).
(function () {
  'use strict';

  var root = document.getElementById('discover-formats');
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = {};
  Array.prototype.forEach.call(root.querySelectorAll('[role="tabpanel"]'), function (p) { panels[p.getAttribute('data-format')] = p; });

  function select(slug, focus) {
    if (!panels[slug]) return;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-format') === slug;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== slug; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      select(t.getAttribute('data-format'));
      history.replaceState(null, '', '#decks-' + t.getAttribute('data-format'));
    });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') d = -i;
      if (e.key === 'End') d = tabs.length - 1 - i;
      if (!d) return;
      e.preventDefault();
      var n = tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-format');
      select(n, true);
      history.replaceState(null, '', '#decks-' + n);
    });
  });

  function fromHash(scroll) {
    var m = /^#decks-([a-z_]+)$/.exec(location.hash);
    if (!m || !panels[m[1]]) return;
    select(m[1]);
    if (scroll) document.getElementById('decks').scrollIntoView();
  }
  window.addEventListener('hashchange', function () { fromHash(true); });
  fromHash(true);
})();
