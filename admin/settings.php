<?php
$adminPageTitle = 'Settings';
$adminSection   = 'settings';
require_once __DIR__ . '/includes/header.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $siteName = trim($_POST['site_name'] ?? '');
        saveSetting('site_name', $siteName !== '' ? $siteName : null);

        $cookieEn = trim($_POST['cookie_consent_en'] ?? '');
        $cookieFr = trim($_POST['cookie_consent_fr'] ?? '');
        saveSetting('cookie_consent_en', $cookieEn !== '' ? $cookieEn : null);
        saveSetting('cookie_consent_fr', $cookieFr !== '' ? $cookieFr : null);

        $metaDescEn  = trim($_POST['meta_description_en'] ?? '');
        $metaDescFr  = trim($_POST['meta_description_fr'] ?? '');
        $ogImage     = trim($_POST['og_image']            ?? '');
        $twHandle    = trim($_POST['twitter_handle']      ?? '');
        saveSetting('meta_description_en', $metaDescEn !== '' ? $metaDescEn : null);
        saveSetting('meta_description_fr', $metaDescFr !== '' ? $metaDescFr : null);
        saveSetting('og_image',            $ogImage    !== '' ? $ogImage    : null);
        saveSetting('twitter_handle',      $twHandle   !== '' ? $twHandle   : null);

        $navbarWidthMode = $_POST['navbar_width_mode'] ?? 'site';
        $navbarWidthPx   = (int)($_POST['navbar_width_px'] ?? 0);
        if ($navbarWidthMode === 'full') {
            saveSetting('navbar_width', 'full');
        } elseif ($navbarWidthMode === 'custom' && $navbarWidthPx > 0) {
            saveSetting('navbar_width', (string)$navbarWidthPx);
        } else {
            saveSetting('navbar_width', null);
        }

        flash('Settings saved.');
        redirect(BASE_URL . '/admin/settings');
    }
}

$siteName    = getSetting('site_name')    ?: SITE_NAME;
$cookieEn    = getSetting('cookie_consent_en');
$cookieFr    = getSetting('cookie_consent_fr');
$metaDescEn  = getSetting('meta_description_en');
$metaDescFr  = getSetting('meta_description_fr');
$ogImage     = getSetting('og_image');
$twHandle    = getSetting('twitter_handle');

$_nbw = getSetting('navbar_width');
if ($_nbw === 'full') {
    $navbarWidthMode = 'full';
    $navbarWidthPx   = 0;
} elseif (is_numeric($_nbw) && (int)$_nbw > 0) {
    $navbarWidthMode = 'custom';
    $navbarWidthPx   = (int)$_nbw;
} else {
    $navbarWidthMode = 'site';
    $navbarWidthPx   = 0;
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-gear me-2"></i>Settings</h1>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<ul class="nav nav-tabs mb-0" id="settings-tabs" role="tablist">
    <li class="nav-item" role="presentation">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#stab-general" type="button" role="tab">General</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#stab-cookie" type="button" role="tab">Cookie Consent</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#stab-seo" type="button" role="tab">SEO &amp; Social</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#stab-nav" type="button" role="tab">Navigation</button>
    </li>
</ul>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <div class="tab-content">

        <!-- General -->
        <div class="tab-pane fade show active pt-3" id="stab-general" role="tabpanel">
            <div class="card-altered p-3 mb-4">
                <h6 class="fw-bold mb-3">Site</h6>
                <div class="mb-3" style="max-width:400px">
                    <label class="form-label">Site name</label>
                    <input type="text" name="site_name" class="form-control" value="<?= h($siteName) ?>">
                    <div class="form-text">Leave blank to use the code default (<code><?= h(SITE_NAME) ?></code>).</div>
                </div>
            </div>
        </div>

        <!-- Cookie Consent -->
        <div class="tab-pane fade pt-3" id="stab-cookie" role="tabpanel">
            <div class="card-altered p-3 mb-4">
                <h6 class="fw-bold mb-1">Cookie Consent Banner</h6>
                <p class="text-muted small mb-3">
                    Message displayed to visitors who haven't accepted cookies yet.
                    Leave blank to use the default text from the language files.
                </p>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Message English 🇬🇧</label>
                        <textarea name="cookie_consent_en" class="form-control" rows="3"
                                  placeholder="Leave blank for default"><?= h($cookieEn) ?></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Message French 🇫🇷</label>
                        <textarea name="cookie_consent_fr" class="form-control" rows="3"
                                  placeholder="Leave blank for default"><?= h($cookieFr) ?></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- SEO / Open Graph -->
        <div class="tab-pane fade pt-3" id="stab-seo" role="tabpanel">
            <div class="card-altered p-3 mb-4">
                <h6 class="fw-bold mb-1">SEO / Open Graph</h6>
                <p class="text-muted small mb-3">
                    Used in <code>&lt;meta name="description"&gt;</code>, Open Graph and Twitter Card tags on every page.
                    Leave blank to use the code defaults.
                </p>
                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Site description English 🇬🇧</label>
                        <textarea name="meta_description_en" class="form-control" rows="2"
                                  placeholder="<?= h(SITE_DESCRIPTION_EN) ?>"><?= h($metaDescEn) ?></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Site description French 🇫🇷</label>
                        <textarea name="meta_description_fr" class="form-control" rows="2"
                                  placeholder="<?= h(SITE_DESCRIPTION_FR) ?>"><?= h($metaDescFr) ?></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Default OG image <small class="text-muted">(path in assets, e.g. assets/og-image.jpg)</small></label>
                        <input type="text" name="og_image" class="form-control"
                               placeholder="assets/og-image.jpg" value="<?= h($ogImage) ?>">
                        <div class="form-text">Displayed when sharing pages that have no specific image.</div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Twitter / X handle <small class="text-muted">(optional)</small></label>
                        <input type="text" name="twitter_handle" class="form-control"
                               placeholder="@AlteredCore" value="<?= h($twHandle) ?>">
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <div class="tab-pane fade pt-3" id="stab-nav" role="tabpanel">
            <div class="card-altered p-3 mb-4">
                <h6 class="fw-bold mb-1">Navigation bar width</h6>
                <p class="text-muted small mb-3">Controls the horizontal extent of the top navigation bar.</p>
                <div class="d-flex flex-column gap-2">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="navbar_width_mode" id="nbw_site"
                               value="site" <?= $navbarWidthMode === 'site' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="nbw_site">
                            Site width <small class="text-muted">(default — stays within the <?= (int)(defined('SITE_MAX_WIDTH') ? SITE_MAX_WIDTH : 1200) ?>px site container)</small>
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="navbar_width_mode" id="nbw_full"
                               value="full" <?= $navbarWidthMode === 'full' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="nbw_full">
                            Full browser width <small class="text-muted">(stretches to the full viewport width)</small>
                        </label>
                    </div>
                    <div class="form-check d-flex align-items-center gap-2 flex-wrap">
                        <input class="form-check-input" type="radio" name="navbar_width_mode" id="nbw_custom"
                               value="custom" <?= $navbarWidthMode === 'custom' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="nbw_custom">Custom —</label>
                        <div class="input-group" style="max-width:160px">
                            <input type="number" name="navbar_width_px" id="navbar_width_px"
                                   class="form-control form-control-sm"
                                   min="200" max="3000" step="10"
                                   value="<?= $navbarWidthPx ?: 1000 ?>"
                                   onfocus="document.getElementById('nbw_custom').checked=true">
                            <span class="input-group-text">px</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <button type="submit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-floppy-disk me-1"></i> Save settings
    </button>
</form>

<script>
(function () {
    var key    = 'admin-settings-tab';
    var tabs   = document.getElementById('settings-tabs');
    var stored = localStorage.getItem(key);
    if (stored) {
        var el = tabs.querySelector('[data-bs-target="' + stored + '"]');
        if (el) bootstrap.Tab.getOrCreateInstance(el).show();
    }
    tabs.querySelectorAll('[data-bs-toggle="tab"]').forEach(function (btn) {
        btn.addEventListener('shown.bs.tab', function (e) {
            localStorage.setItem(key, e.target.getAttribute('data-bs-target'));
        });
    });
})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
