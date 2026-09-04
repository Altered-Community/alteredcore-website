// card-scan — reusable QR scanner module.
// Exposed as window.CardScan so any page (while card-scan is active) can open the
// same camera scanner. Two modes:
//   'redirect' (default) — single scan → resolve via api.php → redirect to a card URL.
//   'collect'            — continuous scan for building a deck: dedupes by raw QR
//                          content within the session, shows a filmstrip of scanned
//                          cards and a "Done" button, and reports each new card.
// Collect mode is only permitted when card-scan config enables it (window.CS_COLLECT).
//
// window.CS_API is injected by card-scan's global_head.php (the qr.alteredcore.org
// universal resolver: ?q=<raw> → {"ref":...}). jsQR is lazy-loaded on first open().
(function () {
    'use strict';

    var JSQR_SRC = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';

    var DEFAULT_TXT = {
        hint:        'Point the camera at an Altered card QR code',
        cancel:      'Cancel',
        done:        'Done',
        redirecting: 'Redirecting…',
        errCamera:   'Camera access denied or unavailable.',
        errQr:       'This QR code is not supported.',
        errResolve:  'Something went wrong. Please try again.',
        notCard:     'Not a card',
    };

    // ── Lazy jsQR loader ────────────────────────────────────────────────
    var _jsqrPromise = null;
    function loadJsQR() {
        if (window.jsQR) return Promise.resolve();
        if (_jsqrPromise) return _jsqrPromise;
        _jsqrPromise = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = JSQR_SRC;
            s.onload = function () { resolve(); };
            s.onerror = function () { _jsqrPromise = null; reject(new Error('jsQR failed to load')); };
            document.head.appendChild(s);
        });
        return _jsqrPromise;
    }

    // ── DOM (built once, reused) ────────────────────────────────────────
    var el = null;   // cached elements
    function buildDom() {
        if (el) return el;
        var o = document.createElement('div');
        o.id = 'cs-scanner-overlay';
        o.className = 'flex-column align-items-center justify-content-center gap-3 p-3';
        o.setAttribute('role', 'dialog');
        o.setAttribute('aria-modal', 'true');
        o.innerHTML =
            '<div id="cs-strip" aria-label="Scanned cards"></div>' +
            '<p id="cs-hint" class="cs-overlay-hint small text-center mb-0"></p>' +
            '<div id="cs-video-wrap">' +
                '<video id="cs-video" autoplay playsinline muted></video>' +
                '<div id="cs-reticle"></div>' +
                '<div id="cs-toast"></div>' +
            '</div>' +
            '<div id="cs-scan-controls" class="gap-2 align-items-center" style="display:none" aria-label="Camera controls">' +
                '<button class="cs-ctrl" id="cs-zoom-out" type="button" aria-label="Zoom out">&minus;</button>' +
                '<button class="cs-ctrl" id="cs-torch"    type="button" aria-label="Torch"><i class="fa-solid fa-bolt" aria-hidden="true"></i></button>' +
                '<button class="cs-ctrl" id="cs-zoom-in"  type="button" aria-label="Zoom in">+</button>' +
            '</div>' +
            '<p id="cs-error" class="cs-overlay-error small text-center mb-0"></p>' +
            '<div class="d-flex gap-2">' +
                '<button class="btn btn-outline-secondary" id="cs-btn-cancel" type="button"></button>' +
                '<button class="btn btn-primary-altered" id="cs-btn-done" type="button" style="display:none"></button>' +
            '</div>' +
            '<div id="cs-busy"><div class="cs-spinner"></div><div id="cs-busy-msg"></div></div>';
        document.body.appendChild(o);
        el = {
            overlay:  o,
            strip:    o.querySelector('#cs-strip'),
            hint:     o.querySelector('#cs-hint'),
            wrap:     o.querySelector('#cs-video-wrap'),
            video:    o.querySelector('#cs-video'),
            reticle:  o.querySelector('#cs-reticle'),
            toast:    o.querySelector('#cs-toast'),
            controls: o.querySelector('#cs-scan-controls'),
            zoomIn:   o.querySelector('#cs-zoom-in'),
            zoomOut:  o.querySelector('#cs-zoom-out'),
            torch:    o.querySelector('#cs-torch'),
            error:    o.querySelector('#cs-error'),
            cancel:   o.querySelector('#cs-btn-cancel'),
            done:     o.querySelector('#cs-btn-done'),
            busy:     o.querySelector('#cs-busy'),
            busyMsg:  o.querySelector('#cs-busy-msg'),
        };
        return el;
    }

    // ── Session state ───────────────────────────────────────────────────
    var stream = null, track = null, raf = null;
    var zoom = null, torchOn = false, busy = false;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    var S = null;   // current session opts (null when closed)

    function txt(k) { return (S && S.txt && S.txt[k]) || DEFAULT_TXT[k]; }

    // ── Resolve raw QR content via the universal API ────────────────────
    // Returns Promise<{ref} | {err:'qr'|'resolve'}>.
    function resolve(raw) {
        var api = window.CS_API;
        if (!api) return Promise.resolve({ err: 'resolve' });
        return fetch(api + '?q=' + encodeURIComponent(raw))
            .then(function (res) { return res.text().then(function (t) { return { status: res.status, text: t }; }); })
            .then(function (r) {
                var data;
                try { data = JSON.parse(r.text); } catch (e) { return { err: 'resolve' }; }
                if (data && data.ref) return { ref: data.ref };
                if (r.status === 404) return { err: 'qr' };
                return { err: 'resolve' };
            })
            .catch(function () { return { err: 'resolve' }; });
    }

    // ── UI helpers ──────────────────────────────────────────────────────
    function showError(msg) { el.error.textContent = msg; el.error.style.display = 'block'; }
    function hideError()    { el.error.style.display = 'none'; }
    function showBusy(msg)  { el.busyMsg.textContent = msg; el.busy.classList.add('active'); }
    function hideBusy()     { el.busy.classList.remove('active'); }

    var _toastT = null;
    function toast(msg, kind) {
        el.toast.textContent = msg;
        el.toast.className = 'active ' + (kind || '');
        if (_toastT) clearTimeout(_toastT);
        _toastT = setTimeout(function () { el.toast.className = ''; }, 1100);
    }
    function flashOk() {
        el.reticle.classList.add('cs-flash');
        setTimeout(function () { el.reticle.classList.remove('cs-flash'); }, 320);
    }

    // ── Filmstrip (collect mode) ────────────────────────────────────────
    function addTile(ref) {
        var item = document.createElement('div');
        item.className = 'cs-strip-item';
        var inner = (S.renderCardEl && S.renderCardEl(ref)) || null;
        if (inner) { item.appendChild(inner); }
        else { item.textContent = ref; item.classList.add('cs-strip-text'); }
        el.strip.insertBefore(item, el.strip.firstChild);      // most recent on the left
        // slide-in animation
        requestAnimationFrame(function () { item.classList.add('cs-strip-in'); });
    }
    function updateDoneLabel() {
        if (S.mode !== 'collect') return;
        el.done.textContent = txt('done') + ' (' + S.count + ')';
    }

    // ── Camera controls (zoom / torch) ───────────────────────────────────
    // Optical/hardware zoom (track.getCapabilities().zoom) only exists on some
    // Android/Chrome devices. Everywhere else (most PC webcams, iOS Safari) we
    // fall back to a software zoom: CSS-scale the video (cropped by the wrap's
    // overflow:hidden) and shrink the decode crop in tick() to match, so the
    // zoom buttons always work regardless of device.
    var SW_ZOOM_MIN = 1, SW_ZOOM_MAX = 3, SW_ZOOM_STEP = 0.25;

    // Remember the last zoom level per device (localStorage is already scoped to
    // this browser/device) so each phone/PC starts back where the user left it,
    // instead of everyone re-tuning the same default every time.
    var ZOOM_STORE_KEY = 'cs-zoom';
    function loadStoredZoom() {
        try {
            var d = JSON.parse(window.localStorage.getItem(ZOOM_STORE_KEY));
            if (d && typeof d.value === 'number' && typeof d.software === 'boolean') return d;
        } catch (e) {}
        return null;
    }
    function saveZoom() {
        if (!zoom) return;
        try {
            window.localStorage.setItem(ZOOM_STORE_KEY, JSON.stringify({ software: zoom.software, value: zoom.value }));
        } catch (e) {}
    }

    function applyZoom(v) {
        if (!zoom) return;
        zoom.value = Math.min(zoom.max, Math.max(zoom.min, v));
        if (zoom.software) {
            el.video.style.transform = 'scale(' + zoom.value + ')';
        } else if (track) {
            track.applyConstraints({ advanced: [{ zoom: zoom.value }] }).catch(function () {});
        }
        saveZoom();
    }
    function setupControls() {
        var caps = (track && track.getCapabilities) ? track.getCapabilities() : {};
        var stored = loadStoredZoom();
        if (caps && caps.zoom && caps.zoom.max > caps.zoom.min) {
            zoom = { min: caps.zoom.min, max: caps.zoom.max, software: false,
                     step: caps.zoom.step || (caps.zoom.max - caps.zoom.min) / 10, value: caps.zoom.min };
            // Default to slightly zoomed in (rather than the native min) so the QR
            // fills more of the frame without the user having to move the phone
            // closer — unless this device already has a remembered value.
            var hwStart = (stored && stored.software === false)
                ? Math.min(caps.zoom.max, Math.max(caps.zoom.min, stored.value))
                : caps.zoom.min + (caps.zoom.max - caps.zoom.min) * 0.25;
            applyZoom(hwStart);
        } else {
            zoom = { min: SW_ZOOM_MIN, max: SW_ZOOM_MAX, software: true, step: SW_ZOOM_STEP, value: SW_ZOOM_MIN };
            var swStart = (stored && stored.software === true)
                ? Math.min(SW_ZOOM_MAX, Math.max(SW_ZOOM_MIN, stored.value))
                : SW_ZOOM_MIN;
            applyZoom(swStart);
        }
        el.zoomIn.style.display = el.zoomOut.style.display = '';
        el.torch.style.display = (caps && caps.torch) ? '' : 'none';
        el.controls.style.display = 'flex';
    }

    // ── Scan loop ───────────────────────────────────────────────────────
    // Only decode the area inside the visible reticle: keeps this in sync with
    // #cs-reticle's `inset: 14%` in scanner.css. Cropping to that region means
    // less image for jsQR to process each frame and a proportionally bigger QR
    // within it, instead of hunting across the full (mostly irrelevant) frame.
    var RETICLE_INSET = 0.14;
    // When a whole card is framed (not just its QR corner), the QR itself is
    // still small within the reticle. Retry on a tighter, centered "digital
    // zoom" crop before giving up on a frame — this raises the QR's share of
    // the analysed image without the user moving the phone closer, which is
    // what triggers the autofocus-hunting blur.
    var ZOOM_INSET = 0.30;

    function decodeCrop(sx, sy, sw, sh) {
        canvas.width  = sw;
        canvas.height = sh;
        ctx.drawImage(el.video, sx, sy, sw, sh, 0, 0, sw, sh);
        var img = ctx.getImageData(0, 0, sw, sh);
        return window.jsQR ? jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' }) : null;
    }
    // Software zoom (see setupControls) crops a smaller, centered region of the
    // native frame — matches what the CSS-scaled video shows behind the reticle.
    // Hardware zoom needs no extra crop here: the sensor itself is already zoomed.
    function tick() {
        if (!S) return;
        if (!busy && el.video.readyState === el.video.HAVE_ENOUGH_DATA) {
            var vw = el.video.videoWidth, vh = el.video.videoHeight;
            var z  = (zoom && zoom.software) ? zoom.value : 1;
            var cw = (vw * (1 - 2 * RETICLE_INSET)) / z;
            var ch = (vh * (1 - 2 * RETICLE_INSET)) / z;
            var mx = (vw - cw) / 2, my = (vh - ch) / 2;
            var code = decodeCrop(mx, my, cw, ch);
            if (!code) {
                var zx = mx + cw * ZOOM_INSET, zy = my + ch * ZOOM_INSET;
                var zw = cw * (1 - 2 * ZOOM_INSET), zh = ch * (1 - 2 * ZOOM_INSET);
                code = decodeCrop(zx, zy, zw, zh);
            }
            if (code) { onDecode(code.data); }
        }
        raf = requestAnimationFrame(tick);
    }

    function onDecode(raw) {
        if (S.mode === 'redirect') {
            cancelRaf();
            stopTracks();
            showBusy(txt('redirecting'));   // overlay stays active; #cs-busy covers it
            resolve(raw).then(function (r) {
                if (r.ref) {
                    if (S.onResult) { try { S.onResult(r.ref, raw); } catch (e) {} }
                    window.location.href = cardUrl(r.ref);
                } else {
                    hideBusy();
                    showError(r.err === 'qr' ? txt('errQr') : txt('errResolve'));
                    startCamera();   // restarts the camera + tick loop
                }
            });
            return;
        }
        // collect mode — dedupe by raw QR (one physical card = one hash)
        if (S.seen.has(raw)) return;
        S.seen.add(raw);
        busy = true;
        resolve(raw).then(function (r) {
            busy = false;
            if (r.ref) {
                S.count++;
                addTile(r.ref);
                updateDoneLabel();
                flashOk();
                if (S.onResult) { try { S.onResult(r.ref, raw); } catch (e) {} }
            } else {
                toast(txt('notCard'), 'cs-toast-bad');
            }
        });
    }

    function cardUrl(ref) {
        var base = S.cardBase || '';
        return base + encodeURIComponent(ref);
    }

    // ── Camera lifecycle ────────────────────────────────────────────────
    function onStream(s) {
        stream = s;
        el.video.srcObject = stream;
        track = stream.getVideoTracks()[0] || null;
        el.video.addEventListener('loadedmetadata', function () {
            setupControls();
            raf = requestAnimationFrame(tick);
        }, { once: true });
    }
    // Higher capture resolution means more pixels land on the QR code at a given
    // distance, so the user doesn't have to get close enough to trigger autofocus
    // hunting (the blur while the camera refocuses for macro range). focusMode is
    // an optional/advanced constraint: unsupported browsers (e.g. iOS Safari) just
    // ignore it instead of failing the whole request.
    var VIDEO_CONSTRAINTS = {
        width:    { ideal: 1920 },
        height:   { ideal: 1080 },
        advanced: [{ focusMode: 'continuous' }],
    };
    function startCamera() {
        loadJsQR().then(function () {
            return navigator.mediaDevices.getUserMedia({
                video: Object.assign({ facingMode: { exact: 'environment' } }, VIDEO_CONSTRAINTS),
            });
        }).then(onStream).catch(function () {
            navigator.mediaDevices.getUserMedia({
                video: Object.assign({ facingMode: { ideal: 'environment' } }, VIDEO_CONSTRAINTS),
            }).then(onStream).catch(function () { showError(txt('errCamera')); });
        });
    }
    function cancelRaf() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    function stopTracks() {
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
        track = null;
    }

    // ── Open / close ────────────────────────────────────────────────────
    function close(fireCancel) {
        var onCancel = S && S.onCancel;
        cancelRaf();
        stopTracks();
        busy = false; torchOn = false; zoom = null;
        if (el) {
            el.overlay.classList.remove('active');
            hideError(); hideBusy();
            el.torch.classList.remove('cs-active');
            el.controls.style.display = 'none';
            el.video.style.transform = '';
        }
        var wasCollect = S && S.mode === 'collect';
        var count = S ? S.count : 0;
        S = null;
        if (fireCancel && onCancel) { try { onCancel(); } catch (e) {} }
        return { count: count, collect: wasCollect };
    }

    function open(opts) {
        opts = opts || {};
        var mode = opts.mode === 'collect' ? 'collect' : 'redirect';
        if (mode === 'collect' && window.CS_COLLECT !== true) {
            // Collect mode not permitted by card-scan config — refuse (caller should gate on CS_COLLECT).
            if (window.console) console.warn('[CardScan] collect mode disabled (CS_COLLECT is false)');
            return false;
        }
        buildDom();
        // Reset any previous session UI.
        if (S) close(false);
        S = {
            mode:        mode,
            txt:         opts.txt || null,
            cardBase:    opts.cardBase || '',
            onResult:    opts.onResult || null,
            onClose:     opts.onClose || null,
            onCancel:    opts.onCancel || null,
            renderCardEl:opts.renderCardEl || null,
            seen:        new Set(),
            count:       0,
        };

        el.hint.textContent = txt('hint');
        el.cancel.textContent = txt('cancel');
        hideError(); hideBusy();
        el.error.style.display = 'none';

        // Mode-specific chrome.
        var collect = mode === 'collect';
        el.strip.style.display = collect ? 'flex' : 'none';
        el.strip.innerHTML = '';
        el.done.style.display = collect ? '' : 'none';
        if (collect) updateDoneLabel();

        el.overlay.classList.add('active');
        startCamera();
        return true;
    }

    // ── Wire persistent buttons once ────────────────────────────────────
    function wire() {
        el.zoomIn.addEventListener('click',  function () { if (zoom) applyZoom(zoom.value + zoom.step); });
        el.zoomOut.addEventListener('click', function () { if (zoom) applyZoom(zoom.value - zoom.step); });
        el.torch.addEventListener('click', function () {
            if (!track) return;
            var next = !torchOn;
            track.applyConstraints({ advanced: [{ torch: next }] })
                .then(function () { torchOn = next; el.torch.classList.toggle('cs-active', torchOn); })
                .catch(function () {});
        });
        el.cancel.addEventListener('click', function () { close(true); });
        el.done.addEventListener('click', function () {
            var onClose = S && S.onClose, r = close(false);
            if (onClose) { try { onClose(r.count); } catch (e) {} }
        });
    }

    // Build + wire lazily on first open so we don't touch the DOM on pages that never scan.
    var _wired = false;
    var _open = open;
    open = function (opts) {
        buildDom();
        if (!_wired) { _wired = true; wire(); }
        return _open(opts);
    };

    window.CardScan = {
        open: open,
        close: function () { return close(true); },
        isCollectEnabled: function () { return window.CS_COLLECT === true; },
    };
})();
