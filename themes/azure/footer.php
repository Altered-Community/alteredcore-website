</main>
</div><!-- /.site-wrapper -->

<?php
// translations
$_footerLang = getLang();
$_footerTxt  = [
    'en' => [
        'rights'      => 'All rights reserved.',
        'privacy'     => 'Privacy Policy',
        'cookie_msg'  => 'This site uses cookies necessary for it to function (session, language preference). No tracking or advertising cookies are used.',
        'cookie_btn'  => 'Accept',
        'card_detail' => 'View detail',
        'made_by'     => 'Site created by PolluxTroy',
    ],
    'fr' => [
        'rights'      => 'Tous droits réservés.',
        'privacy'     => 'Politique de confidentialité',
        'cookie_msg'  => 'Ce site utilise des cookies nécessaires à son fonctionnement (session, préférence de langue). Aucun cookie de suivi ou publicitaire n\'est utilisé.',
        'cookie_btn'  => 'Accepter',
        'card_detail' => 'Accéder au détail',
        'made_by'     => 'Site créé par PolluxTroy',
    ],
][getUiLang()];
$_footerRights = getSetting('footer_rights_' . getUiLang()) ?: $_footerTxt['rights'];
$_footerLinks      = getFooterLinks();
$_footerLangFlags  = ['en' => '<span class="fi fi-gb"></span>', 'fr' => '<span class="fi fi-fr"></span>', 'es' => '<span class="fi fi-es"></span>', 'it' => '<span class="fi fi-it"></span>', 'de' => '<span class="fi fi-de"></span>'];
$_footerLangNames  = ['en' => 'English', 'fr' => 'Français', 'es' => 'Español', 'it' => 'Italiano', 'de' => 'Deutsch'];
$_footerLangUrls   = [];
foreach (['en', 'fr', 'es', 'it', 'de'] as $_fl2) {
    $_p2 = $_GET;
    $_p2['lang'] = $_fl2;
    $_footerLangUrls[$_fl2] = '?' . http_build_query($_p2);
}
?>

<?php
$_footerByCol = [1 => [], 2 => [], 3 => [], 4 => []];
foreach ($_footerLinks as $_fl) {
    $__col = (int)($_fl['column_num'] ?? 2);
    if ($__col < 1 || $__col > 4) $__col = 2;
    $_footerByCol[$__col][] = $_fl;
}
$_footerColTitles = [];
$_footerColContents = [];
for ($_fc = 1; $_fc <= 4; $_fc++) {
    $_footerColTitles[$_fc]   = getSetting('footer_col' . $_fc . '_title_'   . getUiLang()) ?: '';
    $_footerColContents[$_fc] = getSetting('footer_col' . $_fc . '_content_' . getUiLang()) ?: '';
}
?>
<footer class="az-footer site-footer">
    <div class="container site-footer-inner">

        <!-- 4 columns -->
        <div class="row g-4 mb-4">

            <!-- Col 1: brand + tagline + column 1 links -->
            <div class="col-6 col-md-3 d-none d-md-block">
                <?php if ($_footerColTitles[1] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[1]) ?></div>
                <?php endif; ?>
                <?php if ($_footerColContents[1] !== ''): ?>
                <div class="footer-col-content"><?= $_footerColContents[1] ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[1]): ?>
                <ul class="list-unstyled footer-links mt-3 mb-0">
                    <?php foreach ($_footerByCol[1] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?= !empty($_fl['icon']) ? ac_icon($_fl['icon'], 'me-1') : '' ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>

            <!-- Col 2: links -->
            <div class="col-6 col-md-3 d-none d-md-block">
                <?php if ($_footerColTitles[2] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[2]) ?></div>
                <?php endif; ?>
                <?php if ($_footerColContents[2] !== ''): ?>
                <div class="footer-col-content mb-2"><?= $_footerColContents[2] ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[2]): ?>
                <ul class="list-unstyled footer-links mb-0">
                    <?php foreach ($_footerByCol[2] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?= !empty($_fl['icon']) ? ac_icon($_fl['icon'], 'me-1') : '' ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>

            <!-- Col 3: links -->
            <div class="col-6 col-md-3 d-none d-md-block">
                <?php if ($_footerColTitles[3] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[3]) ?></div>
                <?php endif; ?>
                <?php if ($_footerColContents[3] !== ''): ?>
                <div class="footer-col-content mb-2"><?= $_footerColContents[3] ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[3]): ?>
                <ul class="list-unstyled footer-links mb-0">
                    <?php foreach ($_footerByCol[3] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?= !empty($_fl['icon']) ? ac_icon($_fl['icon'], 'me-1') : '' ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>

            <!-- Col 4: links + fan badge -->
            <div class="col-12 col-md-3 d-flex flex-column">
                <?php if ($_footerColTitles[4] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[4]) ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[4]): ?>
                <ul class="list-unstyled footer-links mb-3">
                    <?php foreach ($_footerByCol[4] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?= !empty($_fl['icon']) ? ac_icon($_fl['icon'], 'me-1') : '' ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
                <?php if ($_footerColContents[4] !== ''): ?>
                <div class="footer-col-content"><?= $_footerColContents[4] ?></div>
                <?php endif; ?>
            </div>

        </div>

        <!-- Theme + lang — always shown on mobile (hidden in header on mobile for Azure) -->
        <div class="d-flex d-md-none justify-content-center align-items-center gap-3 mb-3">
            <button id="theme-toggle" class="ac-icon-button" type="button" aria-label="Toggle theme" data-theme-toggle>
                <?= ac_icon('moon', 'theme-icon-moon') ?><?= str_replace('<svg ', '<svg hidden ', ac_icon('sun', 'theme-icon-sun')) ?>
            </button>
            <div class="dropdown">
                <button class="ac-icon-button" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false"
                        title="<?= h($_footerLangNames[$_footerLang] ?? 'Language') ?>">
                    <?= $_footerLangFlags[$_footerLang] ?? '🌐' ?>
                </button>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-flags">
                    <?php foreach ($_footerLangFlags as $_fl3 => $_flag3): ?>
                    <li>
                        <a class="dropdown-item <?= $_footerLang === $_fl3 ? 'active' : '' ?>"
                           href="<?= h($_footerLangUrls[$_fl3]) ?>">
                            <?= $_flag3 ?>
                        </a>
                    </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>

        <!-- Footer bottom: copyright + privacy link -->
        <div class="footer-bottom">
            <span>
                &copy; <?= date('Y') ?> <?= h(getSiteName()) ?> — <?= h($_footerRights) ?>
                &nbsp;·&nbsp; <a href="https://github.com/Altered-Community/alteredcore-website" target="_blank" rel="noopener"><?= h($_footerTxt['made_by']) ?></a>
                &nbsp;·&nbsp;
                <a href="<?= BASE_URL ?>/pages/privacy"><?= h($_footerTxt['privacy']) ?></a>
            </span>
        </div>

    </div>
</footer>

<?php
$__consentMsg = getSetting('cookie_consent_' . getLang());
if ($__consentMsg === '') $__consentMsg = $_footerTxt['cookie_msg'];
$__consentBtn = $_footerTxt['cookie_btn'];
$__needConsent = empty($_COOKIE['alteredcore_consent']) ? 'true' : 'false';
?>

<!-- Cookie consent modal -->
<div class="modal fade" id="cookieModal" tabindex="-1" aria-labelledby="cookieModalLabel"
     data-bs-backdrop="static" data-bs-keyboard="false" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered cookie-dialog">
        <div class="modal-content">
            <div class="modal-body p-4 text-center">
                <div class="cookie-emoji" aria-hidden="true">🍪</div>
                <h5 id="cookieModalLabel" class="ac-text-title mb-2">Cookies</h5>
                <p class="ac-text-muted mb-4"><?= h($__consentMsg) ?></p>
                <div class="d-flex flex-column gap-2">
                    <button id="cookie-accept" type="button" class="ac-button ac-button--full">
                        <?= h($__consentBtn) ?>
                    </button>
                    <a href="<?= BASE_URL ?>/pages/privacy" class="ac-text-small"><?= h($_footerTxt['privacy']) ?></a>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Card embed lightbox (for [card] shortcodes in content) -->
<div id="sc-card-lightbox" class="card-lightbox" style="display:none">
    <div id="sc-card-lightbox-inner" class="card-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>
<script>
(function () {
    var embeds = document.querySelectorAll('.altered-card-embed');
    if (!embeds.length) return;
    var modal      = document.getElementById('sc-card-lightbox');
    var inner      = document.getElementById('sc-card-lightbox-inner');
    var rendererSrc = 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js';
    var rendererLoaded = false;
    var detailLabel = <?= json_encode($_footerTxt['card_detail']) ?>;

    function loadRenderer(cb) {
        if (rendererLoaded) { cb(); return; }
        var s = document.createElement('script');
        s.src = rendererSrc;
        s.onload = function () { rendererLoaded = true; cb(); };
        document.head.appendChild(s);
    }

    function openModal(embed) {
        inner.innerHTML = '';
        var ref    = embed.dataset.ref;
        var unique = embed.dataset.unique === '1';
        var lang   = embed.dataset.lang || 'en';
        var url    = embed.dataset.url;

        function buildContent() {
            var cardEl;
            if (unique) {
                cardEl = document.createElement('altered-card');
                cardEl.setAttribute('ref', ref);
                cardEl.setAttribute('locale', lang);
                cardEl.className = 'card-lightbox-card';
            } else {
                var srcImg = embed.querySelector('img');
                cardEl = document.createElement('img');
                cardEl.src = srcImg ? srcImg.src : '';
                cardEl.alt = ref;
                cardEl.className = 'card-lightbox-card card-lightbox-card--img';
            }
            cardEl.addEventListener('click', closeModal);
            inner.appendChild(cardEl);
            if (url) {
                var btn = document.createElement('a');
                btn.href = url;
                btn.innerHTML = acIcon('info');
                btn.appendChild(document.createTextNode(' ' + detailLabel));
                btn.className = 'ac-button ac-button--full card-lightbox-link';
                inner.appendChild(btn);
            }
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        if (unique) {
            loadRenderer(buildContent);
        } else {
            buildContent();
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        inner.innerHTML = '';
        document.body.style.overflow = '';
    }

    embeds.forEach(function (el) {
        el.addEventListener('click', function () { openModal(el); });
    });
    modal.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
})();
</script>

<?php foreach ($GLOBALS['_ac_global_plugin_js'] ?? [] as $_pgjs): ?>
<script src="<?= h($_pgjs) ?>"></script>
<?php endforeach; ?>
<?php foreach ($GLOBALS['_ac_plugin_js'] ?? [] as $_pjs): ?>
<script src="<?= h($_pjs) ?>"></script>
<?php endforeach; ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
(function() {
    var needConsent = <?= $__needConsent ?>;
    if (!needConsent) return;

    function showCookieModal() {
        var el = document.getElementById('cookieModal');
        if (!el) return;
        var modal = new bootstrap.Modal(el);
        modal.show();

        document.getElementById('cookie-accept').addEventListener('click', function() {
            var d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            document.cookie = 'alteredcore_consent=1;expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
            modal.hide();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showCookieModal);
    } else {
        showCookieModal();
    }
})();
</script>
</body>
</html>
