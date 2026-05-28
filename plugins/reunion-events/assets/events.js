/**
 * Réunion Events - JavaScript
 */
(function () {
    'use strict';

    // ── Geolocation ───────────────────────────────────────────────────────────

    const btnGeo  = document.getElementById('btn-geolocate');
    const cityInput = document.getElementById('search-city');

    if (btnGeo && cityInput) {
        btnGeo.addEventListener('click', function () {
            if (!navigator.geolocation) {
                alert(btnGeo.dataset.unsupported);
                return;
            }
            const icon = btnGeo.querySelector('i');
            icon.className = 'fa-solid fa-spinner fa-spin';
            btnGeo.disabled = true;

            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    fetch(
                        'https://nominatim.openstreetmap.org/reverse?lat=' + pos.coords.latitude +
                        '&lon=' + pos.coords.longitude + '&format=json',
                        { headers: { 'Accept-Language': document.documentElement.lang || 'fr' } }
                    )
                    .then(function (r) { return r.json(); })
                    .then(function (d) {
                        const a = d.address || {};
                        const city = a.city || a.town || a.village || a.municipality || a.county || '';
                        if (city) { cityInput.value = city; cityInput.focus(); }
                        else { alert(btnGeo.dataset.error); }
                    })
                    .catch(function () { alert(btnGeo.dataset.error); })
                    .finally(function () {
                        icon.className = 'fa-solid fa-crosshairs';
                        btnGeo.disabled = false;
                    });
                },
                function () {
                    alert(btnGeo.dataset.error);
                    icon.className = 'fa-solid fa-crosshairs';
                    btnGeo.disabled = false;
                },
                { timeout: 8000 }
            );
        });
    }

    // ── View toggle ───────────────────────────────────────────────────────────

    const btnList     = document.getElementById('btn-view-list');
    const btnCalendar = document.getElementById('btn-view-calendar');
    const viewList    = document.getElementById('view-list');
    const viewCal     = document.getElementById('view-calendar');

    if (!btnList || !btnCalendar || !viewList || !viewCal) return;

    btnList.addEventListener('click', function () {
        btnList.classList.add('active');
        btnCalendar.classList.remove('active');
        viewList.style.display = '';
        viewCal.style.display  = 'none';
    });

    btnCalendar.addEventListener('click', function () {
        btnCalendar.classList.add('active');
        btnList.classList.remove('active');
        viewList.style.display = 'none';
        viewCal.style.display  = '';
        if (!calendarInitialized) {
            calendarInitialized = true;
            renderCalendar();
        }
    });

    // ── Calendar ──────────────────────────────────────────────────────────────

    const events  = window._reEvents || [];
    const lang    = window._reLang   || 'fr';
    let calYear, calMonth, selectedDate = null;
    let calendarInitialized = false;

    // Index events by YYYY-MM-DD
    const byDate = {};
    events.forEach(function (e) {
        if (!e.date) return;
        const key = e.date.substring(0, 10);
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(e);
    });

    // Initial month: first upcoming event, or current month
    (function () {
        const now = new Date();
        const todayStr = now.toISOString().substring(0, 10);
        const upcoming = Object.keys(byDate).filter(function (d) { return d >= todayStr; }).sort();
        const first    = upcoming[0] || Object.keys(byDate).sort()[0];
        if (first) {
            const p = first.split('-');
            calYear  = parseInt(p[0]);
            calMonth = parseInt(p[1]) - 1;
        } else {
            calYear  = now.getFullYear();
            calMonth = now.getMonth();
        }
    }());

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function renderCalendar() {
        const today    = new Date().toISOString().substring(0, 10);
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const offset   = (firstDay + 6) % 7; // Mon = 0
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

        // Month title
        const title = new Date(calYear, calMonth, 1)
            .toLocaleString(lang, { month: 'long', year: 'numeric' });
        const titleCap = title.charAt(0).toUpperCase() + title.slice(1);

        // Day headers (Mon → Sun)
        const dayHeaders = Array.from({ length: 7 }, function (_, i) {
            return new Date(2024, 0, i + 1)
                .toLocaleString(lang, { weekday: 'short' })
                .replace('.', '');
        });

        // Grid cells
        let cells = '';
        for (let i = 0; i < offset; i++) {
            cells += '<div class="re-cal-day re-cal-empty"></div>';
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const ds = calYear + '-' +
                String(calMonth + 1).padStart(2, '0') + '-' +
                String(d).padStart(2, '0');
            const evs   = byDate[ds] || [];
            const count = evs.length;
            const cls   = [
                're-cal-day',
                count  ? 're-cal-has-events' : '',
                ds === today        ? 're-cal-today'    : '',
                ds === selectedDate ? 're-cal-selected' : '',
            ].filter(Boolean).join(' ');
            const dots = count
                ? '<span class="re-cal-badge">' + count + '</span>'
                : '';
            cells += '<div class="' + cls + '" data-date="' + ds + '">' +
                     '<span class="re-cal-num">' + d + '</span>' + dots + '</div>';
        }

        viewCal.innerHTML =
            '<div class="re-calendar">' +
                '<div class="re-cal-header">' +
                    '<button class="re-cal-nav" id="re-cal-prev"><i class="fa-solid fa-chevron-left"></i></button>' +
                    '<span class="re-cal-title">' + esc(titleCap) + '</span>' +
                    '<button class="re-cal-nav" id="re-cal-next"><i class="fa-solid fa-chevron-right"></i></button>' +
                '</div>' +
                '<div class="re-cal-grid">' +
                    dayHeaders.map(function (n) {
                        return '<div class="re-cal-day-header">' + esc(n) + '</div>';
                    }).join('') +
                    cells +
                '</div>' +
            '</div>' +
            '<div id="re-cal-events"></div>';

        // Navigation
        document.getElementById('re-cal-prev').addEventListener('click', function () {
            calMonth--;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            selectedDate = null;
            renderCalendar();
        });
        document.getElementById('re-cal-next').addEventListener('click', function () {
            calMonth++;
            if (calMonth > 11) { calMonth = 0; calYear++; }
            selectedDate = null;
            renderCalendar();
        });

        // Day click
        viewCal.querySelectorAll('.re-cal-has-events').forEach(function (cell) {
            cell.addEventListener('click', function () {
                selectedDate = cell.dataset.date;
                renderCalendar();
                renderDayEvents(selectedDate);
            });
        });

        // Restore selected day events after re-render
        if (selectedDate && byDate[selectedDate]) {
            renderDayEvents(selectedDate);
        }
    }

    function renderDayEvents(dateStr) {
        const container = document.getElementById('re-cal-events');
        if (!container) return;

        const date = new Date(dateStr + 'T00:00:00');
        const label = date.toLocaleDateString(lang, {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
        const evs = byDate[dateStr] || [];

        let html = '<h6 class="re-cal-day-title">' + esc(labelCap) + '</h6>' +
                   '<div class="events-list">';

        evs.forEach(function (e) {
            html +=
                '<a href="' + esc(e.url) + '" class="event-card card-altered p-4" target="_blank" rel="noopener">' +
                    '<div class="event-card-inner">' +
                        '<div class="event-info">' +
                            '<h5 class="event-title mb-1">' +
                                '<i class="fa-solid fa-trophy text-warning me-2"></i>' +
                                esc(e.name) +
                            '</h5>' +
                            '<div class="event-details">' +
                                (e.location ? '<span><i class="fa-solid fa-location-dot"></i>' + esc(e.location) + '</span>' : '') +
                                (e.format   ? '<span><i class="fa-solid fa-layer-group"></i>'  + esc(e.format)   + '</span>' : '') +
                                (e.players  ? '<span><i class="fa-solid fa-users"></i>'         + esc(e.players)  + '</span>' : '') +
                                (e.distance ? '<span><i class="fa-solid fa-route"></i>'         + esc(String(e.distance)) + ' km</span>' : '') +
                            '</div>' +
                        '</div>' +
                        '<div class="event-actions">' +
                            '<i class="fa-solid fa-arrow-up-right-from-square text-muted"></i>' +
                        '</div>' +
                    '</div>' +
                '</a>';
        });

        html += '</div>';
        container.innerHTML = html;
    }

}());
