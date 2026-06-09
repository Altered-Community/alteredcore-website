/**

 * Réunion Events - JavaScript (physical + BGA list/calendar)

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



    function buildEventDetailsHtml(e, mode) {

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



    function initListCalendar(ids, getEvents, mode) {

        const btnList     = document.getElementById(ids.btnList);

        const btnCalendar = document.getElementById(ids.btnCalendar);

        const viewList    = document.getElementById(ids.viewList);

        const viewCal     = document.getElementById(ids.viewCal);



        if (!btnList || !btnCalendar || !viewList || !viewCal) {

            return null;

        }



        let calYear;

        let calMonth;

        let selectedDate = null;

        let calendarInitialized = false;

        let calendarVisible = false;



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



            let html = '<h6 class="re-cal-day-title">' + esc(labelCap) + '</h6><div class="events-list">';



            if (!evs.length) {

                html += '<p class="text-muted mb-0">' + esc((window._reBgaStrings || {}).no_results || '') + '</p>';

            }



            evs.forEach(function (e) {

                const subtitle = mode === 'bga' && e.series

                    ? '<p class="small text-muted mb-2">' + esc(e.series) + '</p>'

                    : '';

                html +=

                    '<a href="' + esc(e.url) + '" class="event-card card-altered p-4" target="_blank" rel="noopener">' +

                        '<div class="event-card-inner">' +

                            '<div class="event-info">' +

                                '<h5 class="event-title mb-1">' +

                                    '<i class="fa-solid fa-trophy text-warning me-2"></i>' + esc(e.name) +

                                '</h5>' + subtitle +

                                '<div class="event-details">' + buildEventDetailsHtml(e, mode) + '</div>' +

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

                const count = (byDate[ds] || []).length;

                const cls   = [

                    're-cal-day',

                    count ? 're-cal-has-events' : '',

                    ds === today ? 're-cal-today' : '',

                    ds === selectedDate ? 're-cal-selected' : '',

                ].filter(Boolean).join(' ');

                const dots = count ? '<span class="re-cal-badge">' + count + '</span>' : '';

                cells += '<div class="' + cls + '" data-date="' + ds + '">' +

                         '<span class="re-cal-num">' + d + '</span>' + dots + '</div>';

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



        function showList() {

            calendarVisible = false;

            btnList.classList.add('active');

            btnCalendar.classList.remove('active');

            viewList.classList.remove('d-none');

            viewList.style.removeProperty('display');

            viewCal.classList.add('d-none');

            viewCal.style.display = 'none';

        }



        function showCalendar() {

            calendarVisible = true;

            btnCalendar.classList.add('active');

            btnList.classList.remove('active');

            viewList.classList.add('d-none');

            viewList.style.display = 'none';

            viewCal.classList.remove('d-none');

            viewCal.style.display = 'block';



            calendarInitialized = true;

            initCalMonth();

            window.requestAnimationFrame(function () {

                renderCalendar();

            });

        }



        btnList.addEventListener('click', showList);

        btnCalendar.addEventListener('click', showCalendar);



        return {

            refresh: function () {

                initCalMonth();

                if (calendarInitialized && calendarVisible) {

                    renderCalendar();

                }

            },

            isCalendarVisible: function () {

                return calendarVisible;

            },

            showList: showList,

        };

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



    function eventMatchesBgaFilters(e, filters) {

        if (filters.format && (e.filter_format || e.format || '') !== filters.format) {

            return false;

        }

        if (filters.deck && (e.filter_deck || e.deck_format || '') !== filters.deck) {

            return false;

        }

        if (filters.pace && (e.filter_pace || e.game_pace || '') !== filters.pace) {

            return false;

        }

        return true;

    }



    function initBgaFilters(appliedFilters, calendarApi) {

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

            appliedFilters.format = formatSel.value || '';

            appliedFilters.deck   = deckSel.value || '';

            appliedFilters.pace   = paceSel.value || '';

            applyListFilters(appliedFilters);

            if (calendarApi) {

                calendarApi.refresh();

            }

        }



        function runReset() {

            formatSel.selectedIndex = 0;

            deckSel.selectedIndex   = 0;

            paceSel.selectedIndex   = 0;

            appliedFilters.format = '';

            appliedFilters.deck   = '';

            appliedFilters.pace   = '';

            applyListFilters(appliedFilters);

            if (calendarApi) {

                calendarApi.refresh();

            }

            if (calendarApi && calendarApi.showList) {

                calendarApi.showList();

            }

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



        applyListFilters(appliedFilters);

    }



    function boot() {

        loadBgaEvents();



        const physicalTab = document.getElementById('re-tab-physical');

        if (physicalTab) {

            initGeolocation(physicalTab);

            initListCalendar({

                btnList: 'btn-view-list',

                btnCalendar: 'btn-view-calendar',

                viewList: 'view-list',

                viewCal: 'view-calendar',

            }, function () {

                return window._reEvents || [];

            }, 'physical');

            applyPhysLocalStartTimes(physicalTab);

        }



        const bgaTab = document.getElementById('re-tab-bga');

        if (!bgaTab) {

            return;

        }



        const allBga = loadBgaEvents();

        const appliedFilters = { format: '', deck: '', pace: '' };



        function getAppliedFilters() {

            return {

                format: appliedFilters.format,

                deck:   appliedFilters.deck,

                pace:   appliedFilters.pace,

            };

        }



        function getFilteredBgaEvents() {

            const filters = getAppliedFilters();

            return allBga.filter(function (e) {

                return eventMatchesBgaFilters(e, filters);

            });

        }



        const calendarApi = initListCalendar({

            btnList: 'btn-bga-view-list',

            btnCalendar: 'btn-bga-view-calendar',

            viewList: 'bga-view-list',

            viewCal: 'bga-view-calendar',

        }, getFilteredBgaEvents, 'bga');



        if (document.getElementById('bga-filter-format')) {

            initBgaFilters(appliedFilters, calendarApi);

        }



        applyBgaLocalStartTimes(bgaTab);



        const bgaTabBtn = document.getElementById('re-tab-bga-btn');

        if (bgaTabBtn) {

            bgaTabBtn.addEventListener('shown.bs.tab', function () {

                applyBgaLocalStartTimes(bgaTab);

                if (calendarApi && calendarApi.isCalendarVisible()) {

                    calendarApi.refresh();

                }

            });

        }

    }



    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', boot);

    } else {

        boot();

    }

}());


