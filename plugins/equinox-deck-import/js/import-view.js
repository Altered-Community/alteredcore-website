// Equinox Deck Import — DOM rendering for the import queue (EDI.View).
// Renders from the engine snapshot; wires button actions back to the engine
// through the handlers passed at creation. No business logic here.
//
// The deck list lives in a fixed-height, internally-scrolling box so the page
// never reflows as decks complete; completed decks stay visible (no hiding),
// and the active deck is followed by scrolling that box only — never the page.
(function () {
    'use strict';

    var EDI = window.EDI = window.EDI || {};
    var esc = EDI.util.escHtml;
    var t   = EDI.util.t;
    var tf  = EDI.util.tf;
    // Lucide icon from the design system (design-system/js/ac.js, loaded by the shell).
    function icon(name, cls) { return typeof window.acIcon === 'function' ? window.acIcon(name, cls) : ''; }

    function create(opts) {
        var $form      = opts.form;
        var $container = opts.container;
        var handlers   = opts.handlers || {};

        var built = false;
        var $listScroll, $progressBar, $progressText, $etaText, $deckTbody, $btnPause, $btnCancel, $summaryWrap;

        // ── Parsing / error states (before the queue exists) ──────────────────
        function showParsing() {
            var btn = $form.querySelector('button[type="submit"]');
            if (btn) {
                btn._ediOriginalHTML = btn.innerHTML;
                btn.disabled  = true;
                btn.innerHTML = icon('loader-circle', 'ac-icon--spin') + esc(t('q_parsing'));
            }
            $form.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = true; });
        }

        function showError(msg) {
            var btn = $form.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled  = false;
                btn.innerHTML = btn._ediOriginalHTML || icon('file-input') + esc(t('submit'));
            }
            $form.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = false; });
            var prev = $container.querySelector('.edi-parse-error');
            if (prev) { prev.remove(); }
            var el = document.createElement('div');
            el.className = 'ac-notice ac-notice--danger edi-parse-error';
            el.setAttribute('role', 'alert');
            el.innerHTML = icon('circle-alert') + '<div>' + esc(msg) + '</div>';
            var formCard = $form.closest('.edi-form-card');
            if (formCard) { formCard.insertAdjacentElement('beforebegin', el); }
        }

        // ── Build the queue UI once ───────────────────────────────────────────
        function build(snapshot) {
            var formCard = $form.closest('.edi-form-card');
            if (formCard) { formCard.style.display = 'none'; }
            var prevError = $container.querySelector('.edi-parse-error');
            if (prevError) { prevError.remove(); }

            var old = document.getElementById('edi-queue-ui');
            if (old) { old.remove(); }

            var wrap = document.createElement('div');
            wrap.id = 'edi-queue-ui';
            wrap.className = 'ac-stack';

            if (snapshot.dedupWarn) {
                var warn = document.createElement('div');
                warn.className = 'ac-notice ac-notice--warning';
                warn.setAttribute('role', 'status');
                warn.innerHTML = icon('triangle-alert') + '<div>' + esc(t('q_dedup_warn')) + '</div>';
                wrap.appendChild(warn);
            }

            if (EDI.util.debugOn() && snapshot.parseDebug) {
                var dbgEl = document.createElement('div');
                dbgEl.className = 'edi-debug';
                dbgEl.innerHTML = EDI.Debug.parsePanelHTML(snapshot.parseDebug);
                wrap.appendChild(dbgEl);
            }

            var header = document.createElement('div');
            header.id        = 'edi-progress-header';
            header.className = 'ac-card';
            header.innerHTML =
                '<div class="ac-row ac-row--between edi-progress-line">'
              +   '<span id="edi-progress-text" class="ac-text-strong"></span>'
              +   '<span id="edi-eta-text" class="ac-text-small ac-text-muted"></span>'
              + '</div>'
              + '<div class="progress edi-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">'
              +   '<div id="edi-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%"></div>'
              + '</div>'
              + '<div class="ac-row">'
              +   '<button id="edi-btn-pause" type="button" class="ac-button ac-button--secondary ac-button--sm">' + icon('pause') + esc(t('q_pause')) + '</button>'
              +   '<button id="edi-btn-cancel" type="button" class="ac-button ac-button--danger ac-button--sm">' + icon('x') + esc(t('q_cancel')) + '</button>'
              + '</div>';
            wrap.appendChild(header);

            var summary = document.createElement('div');
            summary.id = 'edi-summary';
            summary.style.display = 'none';
            wrap.appendChild(summary);

            var tableWrap = document.createElement('div');
            tableWrap.className = 'ac-table-wrap edi-list-scroll';
            tableWrap.innerHTML =
                '<table class="ac-table edi-queue-table"><thead><tr>'
              +   '<th>' + esc(t('col_deck')) + '</th>'
              +   '<th class="edi-status-col">' + esc(t('col_status')) + '</th>'
              + '</tr></thead><tbody id="edi-deck-tbody"></tbody></table>';
            wrap.appendChild(tableWrap);

            var resetBtn = document.createElement('button');
            resetBtn.id            = 'edi-btn-reset';
            resetBtn.type          = 'button';
            resetBtn.className     = 'ac-button ac-button--sm edi-reset';
            resetBtn.style.display = 'none';
            resetBtn.innerHTML     = icon('plus') + esc(t('q_reset'));
            resetBtn.addEventListener('click', function () {
                if (handlers.onReset) { handlers.onReset(); } else { window.location.reload(); }
            });
            wrap.appendChild(resetBtn);

            $container.appendChild(wrap);

            $listScroll   = tableWrap;
            $progressBar  = document.getElementById('edi-progress-bar');
            $progressText = document.getElementById('edi-progress-text');
            $etaText      = document.getElementById('edi-eta-text');
            $deckTbody    = document.getElementById('edi-deck-tbody');
            $summaryWrap  = document.getElementById('edi-summary');
            $btnPause     = document.getElementById('edi-btn-pause');
            $btnCancel    = document.getElementById('edi-btn-cancel');

            $btnPause.addEventListener('click', function () { if (handlers.onTogglePause) { handlers.onTogglePause(); } });
            $btnCancel.addEventListener('click', function () {
                if (window.confirm(t('q_cancel_confirm')) && handlers.onCancel) { handlers.onCancel(); }
            });

            snapshot.items.forEach(function (_, idx) {
                var tr = document.createElement('tr');
                tr.id  = 'edi-row-' + idx;
                $deckTbody.appendChild(tr);
            });

            // Event delegation for retry buttons (survives row redraws).
            $deckTbody.addEventListener('click', function (e) {
                var btn = e.target.closest('.edi-retry-btn');
                if (!btn) { return; }
                if (handlers.onRetry) { handlers.onRetry(parseInt(btn.getAttribute('data-idx'), 10)); }
            });

            built = true;
        }

        // ── Update from a snapshot ────────────────────────────────────────────
        function update(snapshot) {
            if (!built) { build(snapshot); }
            if (!$progressBar) { return; }

            $progressBar.style.width = snapshot.pct + '%';
            $progressBar.closest('[role="progressbar"]').setAttribute('aria-valuenow', snapshot.pct);
            if (snapshot.finished) {
                $progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
            }

            if (snapshot.finished) {
                $progressText.textContent = snapshot.state === 'done' ? t('q_done') : t('q_cancelled');
            } else {
                $progressText.textContent = tf('q_progress', snapshot.processed, snapshot.total);
            }
            $etaText.textContent = (snapshot.state === 'importing') ? snapshot.eta : '';

            if ($btnPause) {
                $btnPause.style.display = snapshot.finished ? 'none' : '';
                $btnPause.innerHTML = snapshot.state === 'paused'
                    ? icon('play') + esc(t('q_resume'))
                    : icon('pause') + esc(t('q_pause'));
            }
            if ($btnCancel) { $btnCancel.style.display = snapshot.finished ? 'none' : ''; }

            var resetBtn = document.getElementById('edi-btn-reset');
            if (resetBtn) { resetBtn.style.display = snapshot.finished ? '' : 'none'; }

            snapshot.items.forEach(function (item, idx) {
                var tr = document.getElementById('edi-row-' + idx);
                if (tr) { tr.innerHTML = rowHTML(item, idx, snapshot.maxRetries); }
            });

            if (snapshot.finished) { renderSummary(snapshot); }
            else { followCurrent(snapshot.currentIndex); }
        }

        function rowHTML(item, idx, maxRetries) {
            var badge  = statusBadge(item);
            var detail = '';
            if (item.status === 'failed') {
                var left = maxRetries - item.attempts;
                detail = '<div class="edi-row-error">' + esc(item.error_msg)
                       + ' <button type="button" class="edi-retry-btn" data-idx="' + idx + '">'
                       + icon('rotate-ccw') + esc(t('q_retry'))
                       + ' (' + esc(tf(left === 1 ? 'q_retry_left_1' : 'q_retry_left_n', left)) + ')</button></div>';
            } else if (item.status === 'failed_final') {
                detail = '<div class="edi-row-error">' + esc(item.error_msg) + '</div>';
            }
            if (EDI.util.debugOn() && item.debug) {
                detail += EDI.Debug.deckPanelHTML(item.debug);
            }
            return '<td>' + esc(item.name) + detail + '</td><td>' + badge + '</td>';
        }

        function statusBadge(item) {
            switch (item.status) {
                case 'done':         return '<span class="ac-badge ac-badge--green">' + esc(t('deck_ok')) + '</span>';
                case 'skip':         return '<span class="ac-badge">' + esc(t('deck_skip')) + '</span>';
                case 'current':      return '<span class="ac-badge ac-badge--blue">' + icon('loader-circle', 'ac-icon--spin') + esc(t('q_current')) + '</span>';
                case 'failed':       return '<span class="ac-badge ac-badge--orange">' + esc(t('deck_err')) + '</span>';
                case 'failed_final': return '<span class="ac-badge ac-badge--red">' + esc(t('q_failed_final')) + '</span>';
                case 'cancelled':    return '<span class="ac-badge">' + esc(t('q_cancelled_item')) + '</span>';
                default:             return '<span class="ac-badge edi-badge-pending">' + esc(t('q_pending')) + '</span>';
            }
        }

        function renderSummary(snapshot) {
            if (!$summaryWrap) { return; }
            var c           = snapshot.counts;
            var isCancelled = (snapshot.state === 'cancelled');
            var type        = c.failed > 0
                ? (c.done > 0 || c.skip > 0 ? 'warning' : 'danger')
                : (isCancelled ? 'warning' : 'success');
            var iconName = (c.failed > 0 || isCancelled) ? 'triangle-alert' : 'check';
            var parts = [];
            if (c.done      > 0) { parts.push(tf(c.done      === 1 ? 'q_sum_imported_1'  : 'q_sum_imported_n',  c.done)); }
            if (c.skip      > 0) { parts.push(tf(c.skip      === 1 ? 'q_sum_skip_1'      : 'q_sum_skip_n',      c.skip)); }
            if (c.failed    > 0) { parts.push(tf(c.failed    === 1 ? 'q_sum_failed_1'    : 'q_sum_failed_n',    c.failed)); }
            if (c.cancelled > 0) { parts.push(tf(c.cancelled === 1 ? 'q_sum_cancelled_1' : 'q_sum_cancelled_n', c.cancelled)); }
            $summaryWrap.className     = 'ac-notice ac-notice--' + type;
            $summaryWrap.setAttribute('role', 'status');
            $summaryWrap.innerHTML     = icon(iconName) + '<div>' + esc(parts.join(' · ')) + '</div>';
            $summaryWrap.style.display = '';
        }

        // Keep the active deck in view by scrolling the LIST BOX only (never the
        // page): nudge the box just enough when the current row is out of sight.
        function followCurrent(currentIndex) {
            var tr  = document.getElementById('edi-row-' + currentIndex);
            var box = $listScroll;
            if (!tr || !box) { return; }
            var rowRect = tr.getBoundingClientRect();
            var boxRect = box.getBoundingClientRect();
            if (rowRect.top < boxRect.top) {
                box.scrollTop -= (boxRect.top - rowRect.top) + 8;
            } else if (rowRect.bottom > boxRect.bottom) {
                box.scrollTop += (rowRect.bottom - boxRect.bottom) + 8;
            }
        }

        return { showParsing: showParsing, showError: showError, update: update };
    }

    EDI.View = { create: create };
})();
