/*
 * cotton-fall 🌾 — effet décoratif "drop-in".
 * Des boules de coton (PNG) tombent lentement le long de la PAGE (pas de l'écran),
 * avec dérive latérale + rotation erratiques. Au clic : swap PNG + poussée vers le
 * haut + spin inversé amorti, puis retour à l'état standard.
 *
 * Intégration :
 *   <script src="cotton-fall.js" defer></script>
 *   <cotton-fall img-normal="a.png" img-click="b.png"></cotton-fall>
 *
 * Web Component autonome + Shadow DOM → zéro conflit de styles avec le site hôte.
 *
 * Copie AlteredCore (plugins/hidden-creatures), changements marqués « AlteredCore » :
 *   - attribut `once` : chaque boule traverse une fois puis disparaît (pas de retour en
 *     haut) ; la dernière partie, l'élément émet `cotton-fall-end` et se retire ;
 *   - attribut `spawn="viewport"` : les boules partent du haut de l'écran visible
 *     (au lieu d'être étalées sur toute la page) ;
 *   - l'overlay est replié avant chaque mesure, sinon une page qui raccourcit garde
 *     sa hauteur (l'overlay comptait dans scrollHeight).
 */
(() => {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────
  // 5. Bloc de constantes unique — TOUT se règle ici.
  //    (Chaque valeur est aussi surchargeable par attribut / objet JS, cf. §2.)
  // ────────────────────────────────────────────────────────────────────────
  const SPEED = {
    // --- Chute (vertical) ---
    FALL_SECONDS_PER_SCREEN : 30,     // 1 écran parcouru en 15 s → "lente"

    // --- Dérive latérale (horizontal) ---
    DRIFT_AMPLITUDE   : 0.50,   // amplitude max ~12% de la largeur d'écran
    DRIFT_WANDER      : 0.6,    // "nervosité" de la dérive (marche aléatoire amortie)
    DRIFT_RESTORE     : 0.1,    // force de rappel vers l'intérieur (anti-sortie latérale)

    // --- Rotation standard ---
    ROT_SPEED_MIN     : 10,      // °/s (lente)
    ROT_SPEED_MAX     : 24,     // °/s
    ROT_WOBBLE        : 4,      // variation aléatoire lente de la vitesse angulaire

    // --- Clic : poussée verticale ---
    CLICK_PUSH_SPEED  : 0.4,    // impulsion vers le haut, en écrans/s
    CLICK_GRAVITY     : 0.4,    // écrans/s² qui ramène à la vitesse de chute normale

    // --- Clic : spin ---
    CLICK_SPIN_SPEED  : 540,    // °/s au moment du clic (~2 tours/s ≈ "rapide")
    CLICK_SPIN_DAMPING: 2.5,    // vitesse de retour à la rotation normale (amortissement)
  };

  const TIMING = {
    CLICK_IMG_DURATION: 800,    // ms d'affichage du PNG "clic"
    ONCE_REDUCED_MS   : 10000,  // AlteredCore : durée d'affichage d'une boule `once` en reduced-motion
  };

  const LAYOUT = {
    DENSITY_SCREENS_PER_BALL: 2,  // ~1 boule / n hauteurs d'écran
    MIN_COUNT               : 1,    // au moins n boule, même sur page courte
    SIZE                    : 200,   // px (taille d'affichage de référence)
    SIZE_VARIATION          : 0.2,  // ±20% (effet de profondeur)
    HIT_RADIUS              : 80,   // % : rayon du disque cliquable (clip circulaire →
                                    //     les coins transparents du PNG ne captent plus le clic).
                                    //     50 = disque inscrit ; baisser (~46) pour coller à la matière.
  };

  const ASSETS = {
    imgNormal : null,   // URL du PNG boule de coton (placeholder si null)
    imgClick  : null,   // URL du PNG "clic"        (placeholder si null)
  };

  const A11Y = {
    respectReducedMotion : true,    // prefers-reduced-motion → swap PNG sans poussée/spin
    pauseWhenHidden      : true,    // pause quand l'onglet est inactif
  };

  const Z_INDEX = 2147483000;

  // Regroupe les défauts pour la résolution de config (défauts < objet JS < attributs).
  const DEFAULTS = { SPEED, TIMING, LAYOUT, ASSETS, A11Y, Z_INDEX };

  // ────────────────────────────────────────────────────────────────────────
  // Utilitaires
  // ────────────────────────────────────────────────────────────────────────
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const rand  = (lo, hi) => lo + Math.random() * (hi - lo);
  const sign  = (v) => (v < 0 ? -1 : 1);

  // Placeholders intégrés (SVG data-URI) pour développer/tester sans les vrais PNG.
  const placeholder = (accent) => {
    // Petit amas de cercles blancs flous → "boule de coton".
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="g" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#f3f6fb"/>
            <stop offset="100%" stop-color="#dfe7f1"/>
          </radialGradient>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${accent ? 0.6 : 0.9}"/>
          </filter>
        </defs>
        <g filter="url(#s)" fill="url(#g)">
          <circle cx="24" cy="34" r="13"/>
          <circle cx="40" cy="34" r="13"/>
          <circle cx="32" cy="24" r="13"/>
          <circle cx="20" cy="44" r="10"/>
          <circle cx="44" cy="44" r="10"/>
          <circle cx="32" cy="40" r="12"/>
        </g>
        ${accent ? '<g fill="#ffffff"><circle cx="14" cy="16" r="2.2"/><circle cx="50" cy="14" r="1.8"/><circle cx="30" cy="10" r="1.4"/></g>' : ''}
      </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
  };
  const PLACEHOLDER_NORMAL = placeholder(false);
  const PLACEHOLDER_CLICK  = placeholder(true);

  // ────────────────────────────────────────────────────────────────────────
  // Le composant
  // ────────────────────────────────────────────────────────────────────────
  class CottonFall extends HTMLElement {
    constructor() {
      super();
      this._shadow  = this.attachShadow({ mode: 'open' });
      this._balls   = [];
      this._raf     = 0;
      this._last    = 0;
      this._running = false;
      this._paused  = false;
      this._reduced = false;

      // Liaisons stables pour add/removeEventListener.
      this._onFrame       = this._onFrame.bind(this);
      this._onResize      = this._onResize.bind(this);
      this._onVisibility  = this._onVisibility.bind(this);
      this._onMotionPref  = this._onMotionPref.bind(this);
      this._resizeTimer   = 0;
    }

    // ── Cycle de vie ──────────────────────────────────────────────────────
    connectedCallback() {
      this._cfg = this._readConfig();

      // Structure Shadow DOM : un overlay (:host reste "transparent" au flux).
      this._shadow.innerHTML = `
        <style>
          :host { display: contents; }
          .overlay {
            position: absolute;
            top: 0; left: 0;
            pointer-events: none;   /* la page reste 100% cliquable */
            overflow: hidden;       /* aucune barre de défilement parasite */
            margin: 0; padding: 0; border: 0;
          }
          .ball {
            position: absolute;
            top: 0; left: 0;
            pointer-events: auto;   /* seules les boules interceptent les clics */
            cursor: pointer;        /* elles se signalent comme cliquables */
            user-select: none;
            -webkit-user-drag: none;
            will-change: transform; /* rendu GPU, pas de reflow par frame */
            transform: translate3d(0,0,0);
            /* Zone cliquable réduite au disque : les coins transparents du PNG
               laissent passer le clic vers la page. Un cercle est invariant par
               rotation → reste correct malgré le spin. */
            clip-path: circle(var(--hit-radius, 50%));
          }
        </style>
        <div class="overlay" part="overlay"></div>
      `;
      this._overlay = this._shadow.querySelector('.overlay');
      this._overlay.style.zIndex = String(this._cfg.zIndex);
      // Rayon du disque cliquable (hérité par les .ball via variable CSS).
      this._overlay.style.setProperty('--hit-radius', this._cfg.hitRadius + '%');

      // Reduced motion.
      this._mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._reduced = this._cfg.respectReducedMotion && this._mql.matches;
      if (this._mql.addEventListener) this._mql.addEventListener('change', this._onMotionPref);
      else if (this._mql.addListener) this._mql.addListener(this._onMotionPref); // vieux Safari

      this._measure();
      this._syncCount(true); // 1re population : étalée sur la page (désynchronisée)
      // AlteredCore : en reduced-motion, une boule `once` ne bouge pas → elle part après un délai.
      if (this._cfg.once && this._reduced) this._endTimer = setTimeout(() => this._end(), TIMING.ONCE_REDUCED_MS);

      // Observers / listeners.
      this._ro = new ResizeObserver(() => this._onResize());
      this._ro.observe(document.body);
      window.addEventListener('resize', this._onResize, { passive: true });
      if (this._cfg.pauseWhenHidden) {
        document.addEventListener('visibilitychange', this._onVisibility);
      }

      this._start();
    }

    disconnectedCallback() {
      this._stop();
      if (this._ro) this._ro.disconnect();
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('visibilitychange', this._onVisibility);
      if (this._mql) {
        if (this._mql.removeEventListener) this._mql.removeEventListener('change', this._onMotionPref);
        else if (this._mql.removeListener) this._mql.removeListener(this._onMotionPref);
      }
      clearTimeout(this._resizeTimer);
      clearTimeout(this._endTimer);
      this._balls.forEach(b => clearTimeout(b.clickTimer));
      this._balls = [];
      if (this._overlay) this._overlay.innerHTML = '';
    }

    // ── Config : défauts < objet JS global < attributs (les attributs priment) ──
    _readConfig() {
      const g = (typeof window !== 'undefined' && window.COTTON_FALL) || {};
      const attr = (name) => (this.hasAttribute(name) ? this.getAttribute(name) : undefined);
      // pick : attribut > objet JS > défaut ; `parse` convertit la chaîne d'attribut.
      const pick = (attrName, jsVal, def, parse = (s) => s) => {
        const a = attr(attrName);
        if (a !== undefined && a !== '') return parse(a);
        if (jsVal !== undefined && jsVal !== null) return jsVal;
        return def;
      };
      const num = (s) => Number(s);

      return {
        // Assets
        imgNormal : pick('img-normal', g.imgNormal, ASSETS.imgNormal) || PLACEHOLDER_NORMAL,
        imgClick  : pick('img-click',  g.imgClick,  ASSETS.imgClick)  || PLACEHOLDER_CLICK,
        // Layout / densité
        size         : pick('size',           g.size,          LAYOUT.SIZE, num),
        sizeVariation: pick('size-variation',  g.sizeVariation, LAYOUT.SIZE_VARIATION, num),
        density      : pick('density',         g.density,       LAYOUT.DENSITY_SCREENS_PER_BALL, num),
        minCount     : pick('min-count',       g.minCount,      LAYOUT.MIN_COUNT, num),
        hitRadius    : pick('hit-radius',      g.hitRadius,     LAYOUT.HIT_RADIUS, num),
        // Vitesses (surchargeables)
        fallSeconds  : pick('fall-seconds',    g.fallSeconds,   SPEED.FALL_SECONDS_PER_SCREEN, num),
        driftAmp     : pick('drift-amplitude', g.driftAmplitude, SPEED.DRIFT_AMPLITUDE, num),
        driftWander  : pick('drift-wander',    g.driftWander,   SPEED.DRIFT_WANDER, num),
        driftRestore : pick('drift-restore',   g.driftRestore,  SPEED.DRIFT_RESTORE, num),
        rotMin       : pick('rot-min',         g.rotMin,        SPEED.ROT_SPEED_MIN, num),
        rotMax       : pick('rot-max',         g.rotMax,        SPEED.ROT_SPEED_MAX, num),
        // Divers
        zIndex       : pick('z-index',         g.zIndex,        Z_INDEX, num),
        // AlteredCore
        once         : this.hasAttribute('once'),
        spawn        : pick('spawn',           g.spawn,         'page'),
        // A11Y
        respectReducedMotion: g.respectReducedMotion !== undefined ? g.respectReducedMotion : A11Y.respectReducedMotion,
        pauseWhenHidden     : g.pauseWhenHidden      !== undefined ? g.pauseWhenHidden      : A11Y.pauseWhenHidden,
      };
    }

    // ── Mesures (liées à la page, cf. §3) ─────────────────────────────────
    _measure() {
      const de = document.documentElement;
      // AlteredCore : l'overlay replié ne compte plus dans scrollHeight (page qui raccourcit).
      this._overlay.style.height = '0px';
      this._vw   = window.innerWidth;                 // hauteur/largeur d'écran (unités relatives)
      this._vh   = window.innerHeight;
      this._docW = de.clientWidth;                    // largeur du contenu (sans scrollbar)
      this._docH = Math.max(de.scrollHeight, document.body.scrollHeight, this._vh);
      // L'overlay épouse le document → défile avec la page.
      this._overlay.style.width  = this._docW + 'px';
      this._overlay.style.height = this._docH + 'px';
    }

    // ── Densité & nombre de boules (§6) ───────────────────────────────────
    _targetCount() {
      const perBall = this._vh * this._cfg.density;
      const n = Math.round(this._docH / perBall);
      return Math.max(this._cfg.minCount, n);
    }

    _syncCount(initial) {
      if (this._cfg.once && !initial) return; // AlteredCore : une boule `once` ne revient pas
      const target = this._targetCount();
      // Initial : étalées sur la hauteur de page. Ajouts ultérieurs : entrent par le haut.
      while (this._balls.length < target) this._addBall(!initial);
      while (this._balls.length > target) this._removeBall();
    }

    // Point d'ancrage horizontal tiré dans une bande INTÉRIEURE (jamais collé aux bords) :
    // on garde une marge liée à l'amplitude de dérive → la boule a de la place des 2 côtés.
    _pickXPref(size) {
      const span = Math.max(0, this._docW - size);
      const amp  = this._cfg.driftAmp * this._vw;
      const margin = Math.min(amp, span * 0.5);       // au plus la moitié : bande toujours valide
      if (span - 2 * margin <= 0) return span / 2;    // page très étroite → centre
      return rand(margin, span - margin);
    }

    _makeBall(spawnTop) {
      const size = this._cfg.size * (1 + rand(-1, 1) * this._cfg.sizeVariation);
      const depth = size / this._cfg.size;            // >1 : plus grosse ⇒ "plus proche"
      const omegaBase = rand(this._cfg.rotMin, this._cfg.rotMax) * (Math.random() < 0.5 ? -1 : 1);
      const xPref = this._pickXPref(size);

      const b = {
        size, depth, omegaBase,
        x: xPref,
        xPref,
        u: rand(-0.4, 0.4),   // offset de dérive normalisé [-1,1]
        uv: 0,                // vitesse de dérive normalisée
        y: this._spawnY(size, spawnTop),
        vy: this._fallSpeed() * depth,
        angle: rand(0, 360),
        omega: omegaBase,
        wobbleFreq: rand(0.2, 0.6),   // rad/s (variation lente)
        wobblePhase: rand(0, Math.PI * 2),
        el: null,
        clickTimer: 0,
        showingClick: false,
      };

      const el = document.createElement('img');
      el.className = 'ball';
      el.src = this._cfg.imgNormal;
      el.alt = '';
      el.setAttribute('aria-hidden', 'true');
      el.draggable = false;
      el.style.width  = size + 'px';
      el.style.height = size + 'px';
      el.addEventListener('click', (e) => { e.preventDefault(); this._onBallClick(b); });
      b.el = el;
      this._render(b);
      return b;
    }

    // AlteredCore : `spawn="viewport"` → juste au-dessus de l'écran visible (dedans en
    // reduced-motion, la boule ne bougeant pas).
    _spawnY(size, spawnTop) {
      if (this._cfg.spawn === 'viewport') {
        return this._reduced ? window.scrollY + rand(0, Math.max(0, this._vh - size)) : window.scrollY - size;
      }
      return spawnTop ? -size : rand(0, this._docH);
    }

    _addBall(spawnTop) {
      const b = this._makeBall(spawnTop);
      this._overlay.appendChild(b.el);
      this._balls.push(b);
    }

    _removeBall() {
      const b = this._balls.pop();
      if (!b) return;
      clearTimeout(b.clickTimer);
      if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
    }

    _fallSpeed() {
      return this._vh / this._cfg.fallSeconds;        // px/s
    }

    // ── Clic (§8) ─────────────────────────────────────────────────────────
    _onBallClick(b) {
      // 8.1 Swap PNG (temporisé) — conservé même en reduced-motion.
      b.el.src = this._cfg.imgClick;
      b.showingClick = true;
      clearTimeout(b.clickTimer);
      b.clickTimer = setTimeout(() => {
        b.showingClick = false;
        b.el.src = this._cfg.imgNormal;
      }, this._cfg.timingClickImg || TIMING.CLICK_IMG_DURATION);

      if (this._reduced) return; // en reduced-motion : pas de poussée ni de spin.

      // 8.2 Poussée verticale (vers le haut, en écrans/s).
      b.vy = -SPEED.CLICK_PUSH_SPEED * this._vh;
      // 8.3 Spin au clic : rapide, sens opposé à la rotation courante.
      b.omega = SPEED.CLICK_SPIN_SPEED * -sign(b.omega || b.omegaBase);
    }

    // ── Boucle d'animation (§7) ───────────────────────────────────────────
    _start() {
      if (this._running) return;
      this._running = true;
      this._last = 0;
      this._raf = requestAnimationFrame(this._onFrame);
    }

    _stop() {
      this._running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    _onFrame(now) {
      if (!this._running) return;
      if (this._last === 0) this._last = now;
      let dt = (now - this._last) / 1000;
      this._last = now;
      // Garde-fou : onglet revenu au premier plan, alt-tab… → pas de saut géant.
      if (dt > 0.05) dt = 0.05;

      if (!this._reduced) this._step(dt);

      this._raf = requestAnimationFrame(this._onFrame);
    }

    _step(dt) {
      const fall    = this._fallSpeed();
      const gravity = SPEED.CLICK_GRAVITY * this._vh;   // px/s²
      const amp     = this._cfg.driftAmp * this._vw;    // px (borne latérale)
      const now     = performance.now() / 1000;

      for (const b of this._balls) {
        // 7.1 Vertical : gravité qui ramène vy vers la vitesse de chute (jamais au-delà).
        const cruise = fall * b.depth;
        b.vy = Math.min(b.vy + gravity * dt, cruise);
        b.y += b.vy * dt;

        // AlteredCore : `once` → sortie en bas = fin de la boule.
        if (b.y > this._docH && this._cfg.once) {
          b.gone = true;
          continue;
        }
        // Wrap : sorti en bas → respawn en haut, désynchronisé.
        if (b.y > this._docH) {
          b.y = -b.size;
          b.vy = cruise;
          b.xPref = this._pickXPref(b.size);
          b.u = rand(-0.4, 0.4);
          b.uv = 0;
        }

        // 7.2 Latéral : marche aléatoire amortie (Ornstein-Uhlenbeck), bornée.
        const noise = rand(-1, 1);
        b.uv += (this._cfg.driftWander * noise - this._cfg.driftRestore * b.u) * dt;
        b.uv *= (1 - Math.min(1, this._cfg.driftRestore * dt)); // amortissement
        b.u  += b.uv * dt;
        if (b.u >  1) { b.u =  1; b.uv = Math.min(0, b.uv); }   // rappel doux, pas de choc
        if (b.u < -1) { b.u = -1; b.uv = Math.max(0, b.uv); }
        // Amplitude effective = place réellement dispo de CE côté (rappel implicite près
        // des bords) → x reste dans [0, docW-size] sans mur ni collage sur le bord.
        const span = Math.max(0, this._docW - b.size);
        b.xPref = clamp(b.xPref, 0, span);                      // sûreté si la page a rétréci
        const room = Math.max(0, Math.min(amp, b.xPref, span - b.xPref));
        b.x = b.xPref + b.u * room;

        // 7.3 Rotation : omega amorti vers l'omega normal (avec wobble lent).
        //     Au repos → converge vers omegaNormal ; après clic → revient en douceur.
        const wobble = Math.sin(now * b.wobbleFreq + b.wobblePhase) * SPEED.ROT_WOBBLE;
        const omegaNormal = b.omegaBase + wobble * sign(b.omegaBase);
        b.omega += (omegaNormal - b.omega) * SPEED.CLICK_SPIN_DAMPING * dt;
        b.angle += b.omega * dt;

        this._render(b);
      }

      if (this._cfg.once && this._balls.some(b => b.gone)) {
        this._balls = this._balls.filter((b) => {
          if (!b.gone) return true;
          clearTimeout(b.clickTimer);
          b.el.remove();
          return false;
        });
        if (!this._balls.length) this._end();
      }
    }

    // AlteredCore : plus aucune boule `once` → l'élément prévient et se retire.
    _end() {
      this.dispatchEvent(new CustomEvent('cotton-fall-end'));
      this.remove();
    }

    _render(b) {
      // transform seul → accélération GPU, pas de reflow (§10).
      b.el.style.transform =
        `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${b.angle.toFixed(2)}deg)`;
    }

    // ── Handlers ──────────────────────────────────────────────────────────
    _onResize() {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this._measure();
        this._syncCount();
      }, 120); // léger debounce
    }

    _onVisibility() {
      if (document.hidden) {
        this._stop();
      } else if (this._cfg.pauseWhenHidden) {
        this._start();
      }
    }

    _onMotionPref(e) {
      this._reduced = this._cfg.respectReducedMotion && e.matches;
    }
  }

  // Expose les défauts (introspection / réglage global éventuel).
  CottonFall.DEFAULTS = DEFAULTS;

  if (!customElements.get('cotton-fall')) {
    customElements.define('cotton-fall', CottonFall);
  }
})();
