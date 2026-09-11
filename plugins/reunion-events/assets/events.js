/**
 * Réunion Events - JavaScript (unified calendar + physical / BGA lists)
 */
(function () {
    'use strict';

    const locale = (window._reLang === 'fr') ? 'fr-FR' : 'en-US';

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function formatBgaStartLocal(iso, hasTime) {
        if (!iso) {
            return '';
        }
        const d = new Date(iso);
        if (isNaN(d.getTime())) {
            return '';
        }
        const opts = hasTime
            ? { dateStyle: 'long', timeStyle: 'short' }
            : { dateStyle: 'long' };
        return new Intl.DateTimeFormat(locale, opts).format(d);
    }

    function applyBgaLocalStartTimes(root) {
        const scope = root || document;
        scope.querySelectorAll('time.re-bga-start-dt[datetime]').forEach(function (el) {
            const iso = el.getAttribute('datetime');
            if (!iso) {
                return;
            }
            const hasTime = el.getAttribute('data-has-time') === '1';
            const text = formatBgaStartLocal(iso, hasTime);
            if (text) {
                el.textContent = text;
            }
        });
    }

    function applyPhysLocalStartTimes(root) {
        const scope = root || document;
        scope.querySelectorAll('time.re-phys-start-dt[datetime]').forEach(function (el) {
            const iso = el.getAttribute('datetime');
            if (!iso) {
                return;
            }
            const hasTime = el.getAttribute('data-has-time') === '1';
            const text = formatBgaStartLocal(iso, hasTime);
            if (text) {
                el.textContent = text;
            }
        });
    }

    function loadBgaEvents() {
        if (Array.isArray(window._reBgaEvents) && window._reBgaEvents.length) {
            return window._reBgaEvents;
        }
        const el = document.getElementById('re-bga-events-json');
        if (el && el.textContent) {
            try {
                const parsed = JSON.parse(el.textContent);
                if (Array.isArray(parsed)) {
                    window._reBgaEvents = parsed;
                    return parsed;
                }
            } catch (e) {
                /* ignore */
            }
        }
        return Array.isArray(window._reBgaEvents) ? window._reBgaEvents : [];
    }

    function buildByDate(events) {
        const byDate = {};
        events.forEach(function (e) {
            if (!e || !e.date) {
                return;
            }
            const key = String(e.date).substring(0, 10);
            if (!byDate[key]) {
                byDate[key] = [];
            }
            byDate[key].push(e);
        });
        return byDate;
    }

    function initGeolocation(root) {
        const btnGeo    = root.querySelector('#btn-geolocate');
        const cityInput = root.querySelector('#search-city');
        if (!btnGeo || !cityInput) {
            return;
        }

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

    function sourceBadgeHtml(e) {
        const source = e.source || 'physical';
        const label = e.source_label
            || (window._reCalStrings || {})['source_' + source]
            || source;
        return '<span class="re-event-source re-event-source-' + esc(source) + '">' + esc(label) + '</span>';
    }

    function buildEventDetailsHtml(e) {
        const mode = e.source === 'bga' ? 'bga' : 'physical';

        if (mode === 'bga') {
            const startsHtml = e.start_instant_iso
                ? '<span><i class="fa-solid fa-calendar"></i>' + esc(e.starts_label || '') + ': ' +
                    '<time class="re-bga-start-dt" datetime="' + esc(e.start_instant_iso) + '" data-has-time="' +
                    (e.start_has_time ? '1' : '0') + '"></time></span>'
                : '';
            return [
                startsHtml,
                e.format      ? '<span><i class="fa-solid fa-layer-group"></i>' + esc(e.format) + '</span>' : '',
                e.deck_format ? '<span><i class="fa-solid fa-clone"></i>' + esc(e.deck_format) + '</span>' : '',
                e.game_mode   ? '<span><i class="fa-solid fa-gamepad"></i>' + esc(e.game_mode) + '</span>' : '',
                e.game_pace   ? '<span><i class="fa-solid fa-clock"></i>' + esc(e.game_pace) + '</span>' : '',
                e.max_players ? '<span><i class="fa-solid fa-users"></i>' + esc((e.max_players_label || '') + ': ' + e.max_players) + '</span>' : '',
            ].join('');
        }

        return [
            e.location ? '<span><i class="fa-solid fa-location-dot"></i>' + esc(e.location) + '</span>' : '',
            e.format   ? '<span><i class="fa-solid fa-layer-group"></i>'  + esc(e.format)   + '</span>' : '',
            e.players  ? '<span><i class="fa-solid fa-users"></i>'         + esc(e.players)  + '</span>' : '',
            e.distance ? '<span><i class="fa-solid fa-route"></i>'         + esc(String(e.distance)) + ' km</span>' : '',
        ].join('');
    }

    function loadEventBrands() {
        return Array.isArray(window._reEventBrands) ? window._reEventBrands : [];
    }

    function eventMatchesBrand(e, brand) {
        if (!e || !brand) {
            return false;
        }
        if (brand.source === 'bga' && e.source !== 'bga') {
            return false;
        }
        if (brand.source === 'physical' && e.source === 'bga') {
            return false;
        }
        const name = String(e.name || '').toLowerCase();
        const series = String(e.series || '').toLowerCase();
        const nameNeedle = String(brand.match_name || '').toLowerCase();
        const seriesNeedle = String(brand.match_series || '').toLowerCase();
        if (!nameNeedle && !seriesNeedle) {
            return false;
        }
        if (nameNeedle && name.indexOf(nameNeedle) === -1 && series.indexOf(nameNeedle) === -1) {
            return false;
        }
        if (seriesNeedle && series.indexOf(seriesNeedle) === -1) {
            return false;
        }
        return true;
    }

    function brandsForEvent(e) {
        return loadEventBrands().filter(function (brand) {
            return brand.logo_url && eventMatchesBrand(e, brand);
        });
    }

    function brandLogoFromUrl(src, alt, extraClass) {
        if (!src) {
            return '';
        }
        return '<img class="re-cal-brand-logo' + (extraClass ? ' ' + extraClass : '') +
            '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy">';
    }

    function weekdayFillsForMonth(byDate, year, month) {
        const prefix = year + '-' + String(month + 1).padStart(2, '0') + '-';
        const fills = {};
        loadEventBrands().forEach(function (brand) {
            if (!brand.logo_url || !brand.show_every_weekday) {
                return;
            }
            const weekdays = {};
            Object.keys(byDate).forEach(function (ds) {
                if (ds.indexOf(prefix) !== 0) {
                    return;
                }
                const hasMatch = (byDate[ds] || []).some(function (e) {
                    return eventMatchesBrand(e, brand);
                });
                if (hasMatch) {
                    weekdays[new Date(ds + 'T12:00:00').getDay()] = true;
                }
            });
            fills[brand.id] = weekdays;
        });
        return fills;
    }

    function dayMatchingBrands(events, dateStr, sourceFilter, weekdayFills) {
        const dayDate = new Date(dateStr + 'T12:00:00');
        const weekday = dayDate.getDay();
        const matched = [];
        const seen = {};
        loadEventBrands().forEach(function (brand) {
            if (!brand.logo_url || seen[brand.id]) {
                return;
            }
            let show = (events || []).some(function (e) {
                return eventMatchesBrand(e, brand);
            });
            if (!show && weekdayFills && weekdayFills[brand.id] && weekdayFills[brand.id][weekday]
                && sourceFilter !== 'physical') {
                show = brand.source !== 'physical';
            }
            if (show) {
                seen[brand.id] = true;
                matched.push(brand);
            }
        });
        return matched;
    }

    function dayBrandLogosHtml(brands) {
        if (!brands.length) {
            return '';
        }
        return '<span class="re-cal-brand-logos">' + brands.map(function (brand) {
            return brandLogoFromUrl(brand.logo_url, brand.name, 're-cal-brand-logo-day');
        }).join('') + '</span>';
    }

    function eventBrandLogoHtml(e) {
        const brands = brandsForEvent(e);
        if (!brands.length) {
            return '';
        }
        return brandLogoFromUrl(brands[0].logo_url, brands[0].name, 're-cal-brand-logo-card');
    }

    function isFrontierDeckFormat(e) {
        const hay = String((e && (e.filter_deck || e.deck_format)) || '').toLowerCase();
        return hay.indexOf('frontier') !== -1;
    }

    function eventSeasonTint(e, dateStr, allowFrontier) {
        if (!allowFrontier || !e || e.source !== 'bga') {
            return '';
        }
        if (!isFrontierDeckFormat(e)) {
            return '';
        }
        const seasons = seasonsForDate(dateStr, loadFrontierSeasons());
        return seasons.length ? (seasons[0].color || '#2f6fed') : '';
    }

    function loadFrontierSeasons() {
        return Array.isArray(window._reFrontierSeasons) ? window._reFrontierSeasons : [];
    }

    function seasonsForDate(dateStr, seasons) {
        return (seasons || []).filter(function (s) {
            return s && s.start_date && s.end_date
                && dateStr >= s.start_date
                && dateStr <= s.end_date;
        });
    }

    function frontierShortLabel(name) {
        const raw = String(name || '').trim();
        if (!raw) {
            return '';
        }
        const hash = raw.match(/#\s*(\d+)/);
        if (hash) {
            return '#' + hash[1];
        }
        const trailing = raw.match(/(\d+)\s*$/);
        if (trailing) {
            return 'S' + trailing[1];
        }
        return raw.length > 6 ? raw.slice(0, 5) + '…' : raw;
    }

    function frontierBarsHtml(dateStr, seasons, showLabel) {
        const active = seasonsForDate(dateStr, seasons);
        if (!active.length || !showLabel) {
            return '';
        }
        const s = active[0];
        const full = s.name || '';
        const short = frontierShortLabel(full);
        const title = full + ' (' + (s.start_date || '') + ' → ' + (s.end_date || '') + ')';
        return '<span class="re-cal-frontier-start-tag" title="' + esc(title) + '">' +
            '<span class="re-cal-frontier-start-full">' + esc(full) + '</span>' +
            '<span class="re-cal-frontier-start-short">' + esc(short) + '</span>' +
            '</span>';
    }

    function frontierCellStyle(seasonsOnDay) {
        if (!seasonsOnDay || !seasonsOnDay.length) {
            return '';
        }
        const color = seasonsOnDay[0].color || '#2f6fed';
        return ' style="--re-frontier-color:' + esc(color) + '"';
    }

    function frontierDayDetailHtml(dateStr, seasons) {
        const active = seasonsForDate(dateStr, seasons);
        if (!active.length) {
            return '';
        }
        const strings = window._reCalStrings || {};
        const rangeLabel = strings.frontier_range || 'Pool duration';
        const legendLabel = strings.frontier_legend || 'Frontier seasons';
        const logoSrc = (window._reCalAssets || {}).frontierLogo;
        const logo = logoSrc
            ? '<img class="re-cal-frontier-logo re-cal-frontier-logo-detail" src="' + esc(logoSrc) +
              '" alt="Frontier" width="64" height="64" loading="lazy">'
            : '';
        let html = '<div class="re-cal-frontier-day-list">' +
            '<div class="re-cal-frontier-day-heading">' + logo +
            '<strong>' + esc(legendLabel) + '</strong></div>';
        active.forEach(function (s) {
            html +=
                '<div class="re-cal-frontier-day-item">' +
                    '<span class="re-cal-frontier-swatch" style="background:' + esc(s.color || '#2f6fed') + '"></span>' +
                    '<div>' +
                        '<strong>' + esc(s.name || '') + '</strong>' +
                        '<div class="small text-muted">' + esc(rangeLabel) + ': ' +
                            esc(s.start_date || '') + ' → ' + esc(s.end_date || '') +
                        '</div>' +
                    '</div>' +
                '</div>';
        });
        html += '</div>';
        return html;
    }

    function daySourceMarks(events) {
        const strings = window._reCalStrings || {};
        let phys = 0;
        let bga = 0;
        events.forEach(function (e) {
            if (e.source === 'bga') {
                bga++;
            } else {
                phys++;
            }
        });

        let marks = '';
        if (phys > 0) {
            marks +=
                '<span class="re-cal-chip re-cal-chip-physical" title="' +
                esc(strings.source_physical || 'Physical') + '">' +
                '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>' + phys +
                '</span>';
        }
        if (bga > 0) {
            marks +=
                '<span class="re-cal-chip re-cal-chip-bga" title="' +
                esc(strings.source_bga || 'Online') + '">' +
                '<i class="fa-solid fa-globe" aria-hidden="true"></i>' + bga +
                '</span>';
        }
        return marks;
    }

    function initUnifiedCalendar(viewCalId, getEvents, getSourceFilter) {
        const viewCal = document.getElementById(viewCalId);
        if (!viewCal) {
            return null;
        }

        let calYear;
        let calMonth;
        let selectedDate = null;

        function initCalMonth() {
            const byDate = buildByDate(getEvents());
            const now = new Date();
            const todayStr = now.toISOString().substring(0, 10);
            const upcoming = Object.keys(byDate).filter(function (d) { return d >= todayStr; }).sort();
            const first    = upcoming[0] || Object.keys(byDate).sort()[0];
            if (first) {
                const p = first.split('-');
                calYear  = parseInt(p[0], 10);
                calMonth = parseInt(p[1], 10) - 1;
            } else {
                calYear  = now.getFullYear();
                calMonth = now.getMonth();
            }
        }

        initCalMonth();

        function renderDayEvents(dateStr) {
            const container = viewCal.querySelector('.re-cal-day-events');
            if (!container) {
                return;
            }

            const byDate = buildByDate(getEvents());
            const date = new Date(dateStr + 'T12:00:00');
            const label = date.toLocaleDateString(locale, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
            const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
            const evs = byDate[dateStr] || [];
            const emptyMsg = (window._reCalStrings || {}).no_events
                || (window._reBgaStrings || {}).no_results
                || '';
            const source = typeof getSourceFilter === 'function' ? getSourceFilter() : 'all';
            const showFrontier = source !== 'physical';
            const frontierBlock = showFrontier
                ? frontierDayDetailHtml(dateStr, loadFrontierSeasons())
                : '';

            let html = '<h6 class="re-cal-day-title">' + esc(labelCap) + '</h6>' +
                frontierBlock + '<div class="events-list">';

            if (!evs.length && !frontierBlock) {
                html += '<p class="text-muted mb-0">' + esc(emptyMsg) + '</p>';
            } else if (!evs.length && frontierBlock) {
                /* Frontier season info is enough for the day */
            }

            evs.forEach(function (e) {
                const subtitle = e.source === 'bga' && e.series
                    ? '<p class="small text-muted mb-2">' + esc(e.series) + '</p>'
                    : '';
                const brandLogo = eventBrandLogoHtml(e);
                const seasonColor = eventSeasonTint(e, dateStr, showFrontier);
                const cardClass = 'event-card card-altered p-4'
                    + (brandLogo ? ' re-event-card-branded' : '')
                    + (seasonColor ? ' re-event-card-frontier' : '');
                const seasonStyle = seasonColor
                    ? ' style="--re-frontier-color:' + esc(seasonColor) + '"'
                    : '';
                html +=
                    '<a href="' + esc(e.url) + '" class="' + cardClass + '"' + seasonStyle + ' target="_blank" rel="noopener">' +
                        '<div class="event-card-inner">' +
                            (brandLogo ? '<div class="re-event-brand-logo-wrap">' + brandLogo + '</div>' : '') +
                            '<div class="event-info">' +
                                '<h5 class="event-title mb-1">' +
                                    '<i class="fa-solid fa-trophy text-warning me-2"></i>' + esc(e.name) +
                                    ' ' + sourceBadgeHtml(e) +
                                '</h5>' + subtitle +
                                '<div class="event-details">' + buildEventDetailsHtml(e) + '</div>' +
                            '</div>' +
                            '<div class="event-actions">' +
                                '<i class="fa-solid fa-arrow-up-right-from-square text-muted"></i>' +
                            '</div>' +
                        '</div>' +
                    '</a>';
            });

            html += '</div>';
            container.innerHTML = html;
            applyBgaLocalStartTimes(container);
        }

        function renderCalendar() {
            const byDate = buildByDate(getEvents());
            const today    = new Date().toISOString().substring(0, 10);
            const firstDay = new Date(calYear, calMonth, 1).getDay();
            const offset   = (firstDay + 6) % 7;
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const weekdayFills = weekdayFillsForMonth(byDate, calYear, calMonth);

            const title = new Date(calYear, calMonth, 1).toLocaleString(locale, { month: 'long', year: 'numeric' });
            const titleCap = title.charAt(0).toUpperCase() + title.slice(1);

            const dayHeaders = Array.from({ length: 7 }, function (_, i) {
                return new Date(2024, 0, i + 1).toLocaleString(locale, { weekday: 'short' }).replace('.', '');
            });

            let cells = '';
            var d;
            var i;
            for (i = 0; i < offset; i++) {
                cells += '<div class="re-cal-day re-cal-empty"></div>';
            }
            for (d = 1; d <= daysInMonth; d++) {
                const ds = calYear + '-' +
                    String(calMonth + 1).padStart(2, '0') + '-' +
                    String(d).padStart(2, '0');
                const dayEvs = byDate[ds] || [];
                const count = dayEvs.length;
                const source = typeof getSourceFilter === 'function' ? getSourceFilter() : 'all';
                const showOnlineBranding = source !== 'physical';
                const dayBrands = dayMatchingBrands(dayEvs, ds, source, weekdayFills);
                const hasBrand = dayBrands.length > 0;
                const frontierSeasons = showOnlineBranding ? loadFrontierSeasons() : [];
                const daySeasons = seasonsForDate(ds, frontierSeasons);
                const isRangeStart = daySeasons.some(function (s) {
                    return s.start_date === ds || (d === 1 && ds >= s.start_date && ds <= s.end_date);
                });
                const cls   = [
                    're-cal-day',
                    (count || daySeasons.length) ? 're-cal-has-events' : '',
                    daySeasons.length ? 're-cal-has-frontier' : '',
                    isRangeStart && daySeasons.length ? 're-cal-frontier-start' : '',
                    hasBrand ? 're-cal-day-branded' : '',
                    ds === today ? 're-cal-today' : '',
                    ds === selectedDate ? 're-cal-selected' : '',
                ].filter(Boolean).join(' ');
                const marks = count
                    ? '<span class="re-cal-marks">' + daySourceMarks(dayEvs) + '</span>'
                    : '';
                const brandLogos = dayBrandLogosHtml(dayBrands);
                const frontierLabel = frontierBarsHtml(ds, frontierSeasons, isRangeStart && daySeasons.length > 0);
                const frontierStyle = frontierCellStyle(daySeasons);
                cells += '<div class="' + cls + '" data-date="' + ds + '"' + frontierStyle + '>' +
                         frontierLabel +
                         brandLogos +
                         '<span class="re-cal-num">' + d + '</span>' +
                         marks + '</div>';
            }

            viewCal.innerHTML =
                '<div class="re-calendar">' +
                    '<div class="re-cal-header">' +
                        '<button type="button" class="re-cal-nav" data-cal-prev><i class="fa-solid fa-chevron-left"></i></button>' +
                        '<span class="re-cal-title">' + esc(titleCap) + '</span>' +
                        '<button type="button" class="re-cal-nav" data-cal-next><i class="fa-solid fa-chevron-right"></i></button>' +
                    '</div>' +
                    '<div class="re-cal-grid">' +
                        dayHeaders.map(function (n) {
                            return '<div class="re-cal-day-header">' + esc(n) + '</div>';
                        }).join('') +
                        cells +
                    '</div>' +
                '</div>' +
                '<div class="re-cal-day-events"></div>';

            const prevBtn = viewCal.querySelector('[data-cal-prev]');
            const nextBtn = viewCal.querySelector('[data-cal-next]');
            if (prevBtn) {
                prevBtn.addEventListener('click', function () {
                    calMonth--;
                    if (calMonth < 0) { calMonth = 11; calYear--; }
                    selectedDate = null;
                    renderCalendar();
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', function () {
                    calMonth++;
                    if (calMonth > 11) { calMonth = 0; calYear++; }
                    selectedDate = null;
                    renderCalendar();
                });
            }

            viewCal.querySelectorAll('.re-cal-has-events').forEach(function (cell) {
                cell.addEventListener('click', function () {
                    selectedDate = cell.dataset.date;
                    renderCalendar();
                    renderDayEvents(selectedDate);
                });
            });

            if (selectedDate) {
                renderDayEvents(selectedDate);
            }
        }

        function refresh() {
            initCalMonth();
            renderCalendar();
        }

        refresh();

        return { refresh: refresh };
    }

    function cardMatchesFilters(card, filters) {
        const fmt  = card.getAttribute('data-bga-format') || '';
        const deck = card.getAttribute('data-bga-deck') || '';
        const pace = card.getAttribute('data-bga-pace') || '';

        if (filters.format && fmt !== filters.format) {
            return false;
        }
        if (filters.deck && deck !== filters.deck) {
            return false;
        }
        if (filters.pace && pace !== filters.pace) {
            return false;
        }
        return true;
    }

    function initBgaFilters() {
        const form      = document.getElementById('bga-filter-form');
        const formatSel = document.getElementById('bga-filter-format');
        const deckSel   = document.getElementById('bga-filter-deck');
        const paceSel   = document.getElementById('bga-filter-pace');
        const searchBtn = document.getElementById('bga-filter-search');
        const resetBtn  = document.getElementById('bga-filter-reset');
        const emptyMsg  = document.getElementById('bga-filter-empty');
        const cards     = document.querySelectorAll('#bga-events-list .bga-event-card');

        if (!formatSel || !deckSel || !paceSel) {
            return;
        }

        function applyListFilters(filters) {
            let visible = 0;
            cards.forEach(function (card) {
                const match = cardMatchesFilters(card, filters);
                if (match) {
                    card.classList.remove('d-none');
                    card.style.removeProperty('display');
                    visible++;
                } else {
                    card.classList.add('d-none');
                    card.style.display = 'none';
                }
            });
            if (emptyMsg) {
                emptyMsg.classList.toggle('d-none', visible > 0);
            }
        }

        function runSearch() {
            applyListFilters({
                format: formatSel.value || '',
                deck:   deckSel.value || '',
                pace:   paceSel.value || '',
            });
        }

        function runReset() {
            formatSel.selectedIndex = 0;
            deckSel.selectedIndex   = 0;
            paceSel.selectedIndex   = 0;
            applyListFilters({ format: '', deck: '', pace: '' });
        }

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                runSearch();
            });
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', function (e) {
                e.preventDefault();
                runSearch();
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', function (e) {
                e.preventDefault();
                runReset();
            });
        }

        applyListFilters({ format: '', deck: '', pace: '' });
    }

    function boot() {
        loadBgaEvents();

        let sourceFilter = 'all';

        function getUnifiedEvents() {
            const physical = (window._reEvents || []).map(function (e) {
                return Object.assign({}, e, {
                    source: e.source || 'physical',
                    source_label: e.source_label || (window._reCalStrings || {}).source_physical || 'Physical',
                });
            });
            const bga = loadBgaEvents().map(function (e) {
                return Object.assign({}, e, {
                    source: e.source || 'bga',
                    source_label: e.source_label || (window._reCalStrings || {}).source_bga || 'Online',
                });
            });
            const all = physical.concat(bga);
            if (sourceFilter === 'physical') {
                return all.filter(function (e) { return e.source !== 'bga'; });
            }
            if (sourceFilter === 'bga') {
                return all.filter(function (e) { return e.source === 'bga'; });
            }
            return all;
        }

        const unifiedCal = initUnifiedCalendar(
            'view-unified-calendar',
            getUnifiedEvents,
            function () { return sourceFilter; }
        );

        const sourceBtns = document.querySelectorAll('#re-cal-source-filters .re-cal-source-btn');
        const frontierLegend = document.getElementById('re-cal-frontier-legend');

        function syncFrontierLegend() {
            if (!frontierLegend) {
                return;
            }
            frontierLegend.classList.toggle('d-none', sourceFilter === 'physical');
        }

        sourceBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                sourceFilter = btn.getAttribute('data-source') || 'all';
                sourceBtns.forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                syncFrontierLegend();
                if (unifiedCal) {
                    unifiedCal.refresh();
                }
            });
        });
        syncFrontierLegend();

        const calendarTabBtn = document.getElementById('re-tab-calendar-btn');
        if (calendarTabBtn && unifiedCal) {
            calendarTabBtn.addEventListener('shown.bs.tab', function () {
                unifiedCal.refresh();
            });
        }

        const physicalTab = document.getElementById('re-tab-physical');
        if (physicalTab) {
            initGeolocation(physicalTab);
            applyPhysLocalStartTimes(physicalTab);
        }

        const bgaTab = document.getElementById('re-tab-bga');
        if (bgaTab) {
            if (document.getElementById('bga-filter-format')) {
                initBgaFilters();
            }
            applyBgaLocalStartTimes(bgaTab);

            const bgaTabBtn = document.getElementById('re-tab-bga-btn');
            if (bgaTabBtn) {
                bgaTabBtn.addEventListener('shown.bs.tab', function () {
                    applyBgaLocalStartTimes(bgaTab);
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
