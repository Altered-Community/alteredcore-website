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
<?php
// Footer background & deco images
$_ftBgImage    = getSetting('footer_bg_image');
$_ftBgMode     = getSetting('footer_bg_mode') ?: 'cover';
$_ftDecoLeft   = getSetting('footer_deco_left');
$_ftDecoLeftOp = getSetting('footer_deco_left_opacity') !== '' ? (int)getSetting('footer_deco_left_opacity') : 100;
$_ftDecoRight  = getSetting('footer_deco_right');
$_ftDecoRightOp= getSetting('footer_deco_right_opacity') !== '' ? (int)getSetting('footer_deco_right_opacity') : 100;

$_ftCss = '';
if ($_ftBgImage) {
    $_ftCss .= '.site-footer{';
    if ($_ftBgMode === 'repeat') {
        $_ftCss .= 'background-image:url("' . addslashes(BASE_URL . '/' . $_ftBgImage) . '");background-size:auto;background-repeat:repeat;';
    } else {
        $_ftCss .= 'background-image:url("' . addslashes(BASE_URL . '/' . $_ftBgImage) . '");background-size:cover;background-position:center;background-repeat:no-repeat;';
    }
    $_ftCss .= '}';
}
if ($_ftDecoLeft || $_ftDecoRight) {
    $_ftCss .= '.site-footer{position:relative;overflow:hidden;}';
    // keep content above pseudo-elements
    $_ftCss .= '.site-footer>.container{position:relative;z-index:1;}';
}
if ($_ftDecoLeft) {
    $_ftCss .= '.site-footer::before{content:"";position:absolute;bottom:0;left:0;width:35%;max-width:400px;height:100%;'
             . 'background-image:url("' . addslashes(BASE_URL . '/' . $_ftDecoLeft) . '");'
             . 'background-size:contain;background-repeat:no-repeat;background-position:bottom left;'
             . 'opacity:' . round($_ftDecoLeftOp / 100, 2) . ';pointer-events:none;z-index:0;}';
}
if ($_ftDecoRight) {
    $_ftCss .= '.site-footer::after{content:"";position:absolute;bottom:0;right:0;width:35%;max-width:400px;height:100%;'
             . 'background-image:url("' . addslashes(BASE_URL . '/' . $_ftDecoRight) . '");'
             . 'background-size:contain;background-repeat:no-repeat;background-position:bottom right;'
             . 'opacity:' . round($_ftDecoRightOp / 100, 2) . ';pointer-events:none;z-index:0;}';
}
if ($_ftCss): ?>
<style><?= $_ftCss ?></style>
<?php endif; ?>

<footer class="site-footer">
    <div class="container" style="max-width:1200px">

        <!-- 4 colonnes -->
        <div class="row g-4 mb-4">

            <!-- Col 1 : marque + accroche + liens colonne 1 -->
            <div class="col-6 col-md-3 d-none d-md-block">
                <?php if ($_footerColTitles[1] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[1]) ?></div>
                <?php endif; ?>
                <?php if ($_footerColContents[1] !== ''): ?>
                <div class="footer-col-content"><?= $_footerColContents[1] ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[1]): ?>
                <ul class="list-unstyled mt-3 mb-0" style="font-size:.88rem">
                    <?php foreach ($_footerByCol[1] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?php if (!empty($_fl['icon'])): ?><i class="<?= h($_fl['icon']) ?> me-1"></i><?php endif; ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>

            <!-- Col 2 : liens -->
            <div class="col-6 col-md-3 d-none d-md-block">
                <?php if ($_footerColTitles[2] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[2]) ?></div>
                <?php endif; ?>
                <?php if ($_footerColContents[2] !== ''): ?>
                <div class="footer-col-content mb-2"><?= $_footerColContents[2] ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[2]): ?>
                <ul class="list-unstyled mb-0" style="font-size:.88rem">
                    <?php foreach ($_footerByCol[2] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?php if (!empty($_fl['icon'])): ?><i class="<?= h($_fl['icon']) ?> me-1"></i><?php endif; ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>

            <!-- Col 3 : liens -->
            <div class="col-6 col-md-3 d-none d-md-block">
                <?php if ($_footerColTitles[3] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[3]) ?></div>
                <?php endif; ?>
                <?php if ($_footerColContents[3] !== ''): ?>
                <div class="footer-col-content mb-2"><?= $_footerColContents[3] ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[3]): ?>
                <ul class="list-unstyled mb-0" style="font-size:.88rem">
                    <?php foreach ($_footerByCol[3] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?php if (!empty($_fl['icon'])): ?><i class="<?= h($_fl['icon']) ?> me-1"></i><?php endif; ?>
                                <?= h($_fl['label']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>

            <!-- Col 4 : liens + badge fan -->
            <div class="col-12 col-md-3 d-flex flex-column">
                <?php if ($_footerColTitles[4] !== ''): ?>
                <div class="footer-col-title"><?= h($_footerColTitles[4]) ?></div>
                <?php endif; ?>
                <?php if ($_footerByCol[4]): ?>
                <ul class="list-unstyled mb-3" style="font-size:.88rem">
                    <?php foreach ($_footerByCol[4] as $_fl): ?>
                        <li>
                            <a href="<?= h($_fl['url']) ?>"
                               <?= (strpos($_fl['url'], 'http') === 0) ? 'target="_blank" rel="noopener"' : '' ?>>
                                <?php if (!empty($_fl['icon'])): ?><i class="<?= h($_fl['icon']) ?> me-1"></i><?php endif; ?>
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

        <?php if (defined('MOBILE_HEADER_MODE') && MOBILE_HEADER_MODE === 1): ?>
        <!-- Theme + lang — only shown on mobile in compact header mode -->
        <div class="d-flex d-md-none justify-content-center align-items-center gap-3 mb-3">
            <button id="theme-toggle" class="btn-theme-toggle-ac" aria-label="Toggle theme">
                <i id="theme-icon" class="fa-solid fa-moon"></i>
            </button>
            <div class="dropdown">
                <button class="btn-theme-toggle-ac" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false"
                        title="<?= h($_footerLangNames[$_footerLang] ?? 'Language') ?>"
                        style="line-height:1;display:inline-flex;align-items:center">
                    <?= $_footerLangFlags[$_footerLang] ?? '🌐' ?>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" style="min-width:auto">
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
        <?php endif; ?>

        <!-- Bas de page : copyright + privacy + langue + theme -->
        <div class="footer-bottom">
            <span>
                &copy; <?= date('Y') ?> <?= h(getSiteName()) ?> — <?= h($_footerRights) ?>
                &nbsp;·&nbsp; <a href="https://github.com/Altered-Community/alteredcore-website" target="_blank" rel="noopener" style="color:inherit;opacity:.7"><?= h($_footerTxt['made_by']) ?></a>
                &nbsp;·&nbsp;
                <a href="<?= BASE_URL ?>/pages/privacy" style="color:inherit;opacity:.7"><?= h($_footerTxt['privacy']) ?></a>
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
    <div class="modal-dialog modal-dialog-centered" style="max-width:480px">
        <div class="modal-content" style="border-radius:1rem;border:none;overflow:hidden">
            <div class="modal-body p-4 text-center" style="background:var(--sand-100,#FAF5E8)">
                <div style="font-size:2.5rem;margin-bottom:.75rem">🍪</div>
                <h5 id="cookieModalLabel" style="font-weight:800;color:var(--neutral-800,#2C2416);margin-bottom:.75rem">
                    Cookies
                </h5>
                <p style="color:var(--neutral-600,#6B5F4A);font-size:.9rem;line-height:1.55;margin-bottom:1.5rem">
                    <?= h($__consentMsg) ?>
                </p>
                <div class="d-flex flex-column gap-2">
                    <button id="cookie-accept" type="button" class="btn btn-primary-altered w-100" style="font-weight:700">
                        <?= h($__consentBtn) ?>
                    </button>
                    <a href="<?= BASE_URL ?>/pages/privacy"
                       style="font-size:.8rem;color:var(--neutral-500,#8A7D6A)">
                        <?= h($_footerTxt['privacy']) ?>
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Card embed lightbox (for [card] shortcodes in content) -->
<div id="sc-card-lightbox" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);align-items:center;justify-content:center;cursor:pointer">
    <div id="sc-card-lightbox-inner" style="max-width:420px;width:88vw;cursor:default;position:relative" onclick="event.stopPropagation()"></div>
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
                cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
            } else {
                var srcImg = embed.querySelector('img');
                cardEl = document.createElement('img');
                cardEl.src = srcImg ? srcImg.src : '';
                cardEl.alt = ref;
                cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
            }
            cardEl.addEventListener('click', closeModal);
            inner.appendChild(cardEl);
            if (url) {
                var btn = document.createElement('a');
                btn.href = url;
                btn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + detailLabel;
                btn.className = 'btn btn-sm btn-primary-altered';
                btn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
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

<?php foreach ($GLOBALS['_ac_plugin_js'] ?? [] as $_pjs): ?>
<script src="<?= h($_pjs) ?>"></script>
<?php endforeach; ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
(function () {
    var btn  = document.getElementById('theme-toggle');
    var icon = document.getElementById('theme-icon');
    if (!btn) return;

    function applyTheme(dark) {
        if (dark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            icon.className = 'fa-solid fa-sun';
        } else {
            document.documentElement.removeAttribute('data-theme');
            icon.className = 'fa-solid fa-moon';
        }
    }

    // Sync icon with current state (set by anti-FOUC script in <head>)
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark');

    btn.addEventListener('click', function () {
        var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
        applyTheme(dark);
        try { localStorage.setItem('acTheme', dark ? 'dark' : 'light'); } catch (e) {}
    });
}());
</script>
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
