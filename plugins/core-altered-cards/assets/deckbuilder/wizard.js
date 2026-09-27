/* Deckbuilder — wizard.js
 * New-deck wizard dialog (hero picker is hero-picker.js).
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    var elNewModal   = document.getElementById('db-new-modal');
    var elNewName    = document.getElementById('db-new-name');
    var elNewDesc    = document.getElementById('db-new-desc');
    var elNewSubmit  = document.getElementById('db-new-submit');
    var elNewError   = document.getElementById('db-new-error');
    var _newIsPublic = '0';

    function dbNewShowError(msg, withAnyway) {
        if (!elNewError) return;
        elNewError.textContent = msg;
        if (withAnyway) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-outline-danger ms-2';
            btn.textContent = AlteredDB.txt.wizard_anyway;
            btn.addEventListener('click', dbNewFinish);
            elNewError.appendChild(btn);
        }
        elNewError.style.display = '';
    }

    function dbNewSelectedFormat() {
        var picked = elNewModal.querySelector('input[name="db-new-format"]:checked');
        return picked ? picked.value : '';
    }

    function dbNewApplyToPanel() {
        var fmt = dbNewSelectedFormat();
        elDeckName.value = elNewName.value.trim();
        elDeckDesc.value = elNewDesc ? elNewDesc.value.trim() : '';
        if (fmt) elDeckFormat.value = fmt;
        if (elDeckPublic) elDeckPublic.value = _newIsPublic;
        updateDeckDisplay();
    }

    function dbNewFinish() {
        _wizardOpen = false;
        elNewModal.style.display = 'none';
        dbLockScroll(false);
    }

    function dbNewUpdateFormatPills() {
        var hero = deck.hero;
        elNewModal.querySelectorAll('.db-bga-pill[data-fmt-bga]').forEach(function(pill) {
            var fmtOk  = pill.dataset.fmtBga === '1';
            var heroKo = fmtOk && hero && !(_heroPrints || []).some(function(pr) {
                return heroPrintOkIn(pr.ref, pill.dataset.fmtKey);
            });
            pill.textContent = !fmtOk ? AlteredDB.txt.bga_fmt_ko
                             : heroKo ? AlteredDB.txt.bga_hero_ko
                                      : AlteredDB.txt.bga_ok;
            pill.className = 'db-bga-pill' + (!fmtOk ? ' fmt-ko' : heroKo ? ' ko' : '');
            pill.title = (fmtOk && heroKo) ? AlteredDB.txt.bga_hero_title : '';
            var redundant = pill.dataset.fmtArena === '1' && fmtOk && !heroKo;
            pill.style.display = redundant ? 'none' : '';
        });
    }

    function dbNewRenderHero() {
        var hero   = deck.hero;
        var row    = document.getElementById('db-new-hero');
        var img    = document.getElementById('db-new-hero-img');
        var icon   = document.getElementById('db-new-hero-icon');
        var name   = document.getElementById('db-new-hero-name');
        var fact   = document.getElementById('db-new-hero-faction');
        var action = document.getElementById('db-new-hero-action');
        var bga    = document.getElementById('db-new-hero-bga');

        dbNewUpdateFormatPills();

        if (!hero) {
            row.classList.add('empty');
            img.style.display  = 'none';
            icon.style.display = '';
            bga.style.display  = 'none';
            name.textContent   = AlteredDB.txt.hero_slot;
            fact.textContent   = '';
            action.textContent = AlteredDB.txt.choose_hero;
            return;
        }
        row.classList.remove('empty');
        img.src            = cdnUrl(hero.cardReference || '');
        img.alt            = hero.name || '';
        img.style.display  = '';
        icon.style.display = 'none';
        name.textContent   = hero.name || '';
        var fData = AlteredDB.factions[hero.factionCode] || null;
        fact.textContent   = fData ? (fData[AlteredDB.uiLang] || fData.en || '') : (hero.factionCode || '');
        row.style.setProperty('--faction-color', (fData && fData.color) || 'var(--neutral-300)');
        action.textContent = AlteredDB.txt.wizard_change;

        var partial = hero.bgaState === 'partial';
        var ko      = hero.bgaState === 'ko';
        bga.style.display = (partial || ko) ? '' : 'none';
        bga.className     = 'db-bga-pill ' + (partial ? 'partial' : 'ko');
        bga.textContent   = ko ? AlteredDB.txt.bga_hero_ko    : AlteredDB.txt.bga_hero_partial;
        bga.title         = ko ? AlteredDB.txt.bga_hero_title : AlteredDB.txt.bga_partial_title;
    }

    function dbLockScroll(on) {
        document.documentElement.classList.toggle('db-scroll-lock', !!on);
    }

    (function () {
        if (!window.visualViewport) return;
        var panels = ['#db-new-modal', '#db-hero-modal'].map(function (sel) {
            var el = document.querySelector(sel + ' .db-hero-panel');
            return el;
        }).filter(Boolean);
        if (!panels.length) return;

        function syncPanelHeights() {
            if (window.innerWidth > 575) return;
            var vvh = window.visualViewport.height + 'px';
            panels.forEach(function (p) { p.style.setProperty('--vv-height', vvh); });
        }

        window.visualViewport.addEventListener('resize', syncPanelHeights);
        window.visualViewport.addEventListener('scroll', syncPanelHeights);
        syncPanelHeights();
    })();

    var _dbCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    window.dbNewOpen = function() {
        _wizardOpen = true;
        dbNewRenderHero();
        if (elNewError) { elNewError.style.display = 'none'; elNewError.textContent = ''; }
        elNewModal.style.display = 'flex';
        dbLockScroll(true);
        if (elNewName && !_dbCoarsePointer) elNewName.focus();
    };

    window.dbNewPickHero = function() {
        elNewModal.style.display = 'none';
        dbSelectHero();
    };

    window.dbNewCancel = function() { dbWizardLeave(); };

    window.dbNewToggleDesc = function() {
        var wrap   = document.getElementById('db-new-desc-wrap');
        var toggle = document.getElementById('db-new-desc-toggle');
        wrap.style.display = 'block';
        toggle.style.display = 'none';
        if (elNewDesc) elNewDesc.focus();
        if (window.requestAnimationFrame) {
            requestAnimationFrame(function() { wrap.scrollIntoView({ block: 'end', behavior: 'smooth' }); });
        }
    };

    elNewModal.querySelectorAll('.db-new-vis-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            _newIsPublic = btn.dataset.public;
            elNewModal.querySelectorAll('.db-new-vis-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var note = document.getElementById('db-new-vis-note');
            if (note) note.style.visibility = (_newIsPublic === '0') ? '' : 'hidden';
        });
    });

    if (elNewSubmit) {
        elNewSubmit.addEventListener('click', function() {
            if (elNewError) elNewError.style.display = 'none';
            if (!deck.hero)              { dbNewShowError(AlteredDB.txt.wizard_hero_req); return; }
            if (!elNewName.value.trim()) { dbNewShowError(AlteredDB.txt.wizard_name_req); elNewName.focus(); return; }
            if (!dbNewSelectedFormat())  { dbNewShowError(AlteredDB.txt.wizard_fmt_req); return; }

            dbNewApplyToPanel();
            elNewSubmit.disabled    = true;
            elNewSubmit.textContent = AlteredDB.txt.wizard_creating;
            markDirty();
            autoSave(function(ok, err) {
                elNewSubmit.disabled    = false;
                elNewSubmit.textContent = AlteredDB.txt.wizard_create;
                if (ok) dbNewFinish();
                else    dbNewShowError(err || AlteredDB.txt.err_api, true);
            });
        });
    }

