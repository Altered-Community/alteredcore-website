<?php
$adminPageTitle = 'Footer';
$adminSection   = 'footer';
require_once __DIR__ . '/includes/header.php';

$db     = getDB();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } elseif (($_POST['action'] ?? '') === 'save_tagline') {
        saveSetting('footer_tagline_en', trim($_POST['tagline_en'] ?? ''));
        saveSetting('footer_tagline_fr', trim($_POST['tagline_fr'] ?? ''));
        flash('Footer updated.');
        redirect(BASE_URL . '/admin/footer');
    } elseif (($_POST['action'] ?? '') === 'save_legal') {
        saveSetting('footer_rights_en',     trim($_POST['footer_rights_en']     ?? ''));
        saveSetting('footer_rights_fr',     trim($_POST['footer_rights_fr']     ?? ''));
        saveSetting('footer_fan_label_en',  trim($_POST['footer_fan_label_en']  ?? ''));
        saveSetting('footer_fan_label_fr',  trim($_POST['footer_fan_label_fr']  ?? ''));
        saveSetting('footer_unofficial_en', trim($_POST['footer_unofficial_en'] ?? ''));
        saveSetting('footer_unofficial_fr', trim($_POST['footer_unofficial_fr'] ?? ''));
        flash('Legal / bottom bar updated.');
        redirect(BASE_URL . '/admin/footer');
    } elseif (($_POST['action'] ?? '') === 'save_col_titles') {
        for ($__c = 1; $__c <= 4; $__c++) {
            saveSetting('footer_col' . $__c . '_title_en', trim($_POST['col' . $__c . '_title_en'] ?? ''));
            saveSetting('footer_col' . $__c . '_title_fr', trim($_POST['col' . $__c . '_title_fr'] ?? ''));
        }
        flash('Column titles updated.');
        redirect(BASE_URL . '/admin/footer');
    } elseif (($_POST['action'] ?? '') === 'save_col_content') {
        for ($__c = 1; $__c <= 4; $__c++) {
            saveSetting('footer_col' . $__c . '_content_en', $_POST['col' . $__c . '_content_en'] ?? '');
            saveSetting('footer_col' . $__c . '_content_fr', $_POST['col' . $__c . '_content_fr'] ?? '');
        }
        flash('Column content updated.');
        redirect(BASE_URL . '/admin/footer');
    } elseif (($_POST['action'] ?? '') === 'save_deco') {
        // Images via picker
        $validatePicker = function (string $picked): ?string {
            $picked = trim($picked);
            if ($picked === '' || !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $picked)) return null;
            return $picked;
        };

        $ftBg    = $validatePicker($_POST['footer_bg_image_picker'] ?? '');
        $ftDecoL = $validatePicker($_POST['footer_deco_left_picker'] ?? '');
        $ftDecoR = $validatePicker($_POST['footer_deco_right_picker'] ?? '');

        $deletingAny = false;
        foreach (['footer_bg_image' => $ftBg, 'footer_deco_left' => $ftDecoL, 'footer_deco_right' => $ftDecoR] as $settingKey => $newPath) {
            $old = getSetting($settingKey);
            if ($old && $newPath === null) $deletingAny = true;
        }
        if ($deletingAny && !adminCanDelete()) {
            $errors[] = 'You do not have permission to delete images.';
        }
        if (empty($errors)) {
            foreach ([
                'footer_bg_image' => $ftBg,
                'footer_deco_left' => $ftDecoL,
                'footer_deco_right' => $ftDecoR,
            ] as $settingKey => $newPath) {
                $old = getSetting($settingKey);
                if ($old && $newPath !== $old && strpos($old, 'uploads/') === 0) {
                    $p = dirname(__DIR__) . '/' . $old;
                    if (file_exists($p)) unlink($p);
                }
            }
        }

        if (empty($errors)) {
            saveSetting('footer_bg_image',          $ftBg);
            saveSetting('footer_bg_mode',           in_array($_POST['footer_bg_mode'] ?? '', ['cover','repeat']) ? $_POST['footer_bg_mode'] : 'cover');
            saveSetting('footer_deco_left',         $ftDecoL);
            saveSetting('footer_deco_left_opacity', (string)max(0, min(100, (int)($_POST['footer_deco_left_opacity'] ?? 100))));
            saveSetting('footer_deco_right',        $ftDecoR);
            saveSetting('footer_deco_right_opacity',(string)max(0, min(100, (int)($_POST['footer_deco_right_opacity'] ?? 100))));
            flash('Footer images updated.');
            redirect(BASE_URL . '/admin/footer');
        }
    } elseif (($_POST['action'] ?? '') === 'delete_link') {
        if (!adminCanDelete()) {
            flash('You do not have permission to delete.', 'error');
            redirect(BASE_URL . '/admin/footer');
        }
        $lid = (int)($_POST['link_id'] ?? 0);
        if ($lid) {
            $db->prepare(q("DELETE FROM {footer_links} WHERE id = :id"))->execute([':id' => $lid]);
        }
        flash('Link deleted.');
        redirect(BASE_URL . '/admin/footer');
    } elseif (($_POST['action'] ?? '') === 'move_link_up' || ($_POST['action'] ?? '') === 'move_link_down') {
        $lnkAction = $_POST['action'];
        $lid       = (int)($_POST['link_id'] ?? 0);
        if ($lid) {
            $colStmt = $db->prepare(q("SELECT column_num FROM {footer_links} WHERE id = :id"));
            $colStmt->execute([':id' => $lid]);
            $col = (int)$colStmt->fetchColumn();
            if ($col >= 1 && $col <= 4) {
                $colStmt = $db->prepare(q("SELECT id, sort_order FROM {footer_links} WHERE column_num = :c ORDER BY sort_order, id"));
                $colStmt->execute([':c' => $col]);
                $colItems = $colStmt->fetchAll();
                $ids      = array_column($colItems, 'id');
                $pos      = array_search($lid, $ids);
                if ($pos !== false) {
                    $swapPos = $lnkAction === 'move_link_up' ? $pos - 1 : $pos + 1;
                    if (isset($ids[$swapPos])) {
                        $swapId = $ids[$swapPos];
                        $sortA  = $colItems[$pos]['sort_order'];
                        $sortB  = $colItems[$swapPos]['sort_order'];
                        if ($sortA === $sortB) { $sortA = $pos * 10; $sortB = $swapPos * 10; }
                        $db->prepare(q("UPDATE {footer_links} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortB, ':id' => $lid]);
                        $db->prepare(q("UPDATE {footer_links} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortA, ':id' => $swapId]);
                    }
                }
            }
        }
        redirect(BASE_URL . '/admin/footer');
    }
}

$taglineEn      = getSetting('footer_tagline_en')      ?: 'Your Altered TCG companion';
$taglineFr      = getSetting('footer_tagline_fr')      ?: 'Votre compagnon Altered TCG';
$rightsEn       = getSetting('footer_rights_en')       ?: 'All rights reserved.';
$rightsFr       = getSetting('footer_rights_fr')       ?: 'Tous droits réservés.';
$fanLabelEn     = getSetting('footer_fan_label_en')    ?: 'Altered TCG Fan Site';
$fanLabelFr     = getSetting('footer_fan_label_fr')    ?: 'Altered TCG Fan Site';
$unofficialEn   = getSetting('footer_unofficial_en')   ?: 'Unofficial fan site — not affiliated with Equinox.';
$unofficialFr   = getSetting('footer_unofficial_fr')   ?: 'Site fan non officiel — non affilié à Equinox.';
$links          = $db->query(q("SELECT * FROM {footer_links} ORDER BY sort_order, id"))->fetchAll();

$linksByCol = [1 => [], 2 => [], 3 => [], 4 => []];
foreach ($links as $lk) {
    $c = (int)($lk['column_num'] ?? 2);
    if ($c < 1 || $c > 4) $c = 2;
    $linksByCol[$c][] = $lk;
}

$colLabels = [
    1 => 'Column 1',
    2 => 'Column 2',
    3 => 'Column 3',
    4 => 'Column 4',
];

$colTitles = [];
$colContents = [];
for ($__c = 1; $__c <= 4; $__c++) {
    $colTitles[$__c] = [
        'en' => getSetting('footer_col' . $__c . '_title_en') ?? '',
        'fr' => getSetting('footer_col' . $__c . '_title_fr') ?? '',
    ];
    $colContents[$__c] = [
        'en' => getSetting('footer_col' . $__c . '_content_en') ?? '',
        'fr' => getSetting('footer_col' . $__c . '_content_fr') ?? '',
    ];
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-shoe-prints me-2"></i>Footer</h1>
</div>

<ul class="nav nav-tabs mb-0" id="footer-tabs" role="tablist">
    <li class="nav-item" role="presentation">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#ftab-text" type="button" role="tab">Text</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#ftab-columns" type="button" role="tab">Columns</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#ftab-deco" type="button" role="tab">Decoration</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#ftab-links" type="button" role="tab">Links</button>
    </li>
</ul>

<div class="tab-content">

<!-- ── Tab: Text (Tagline + Legal) ── -->
<div class="tab-pane fade show active pt-3" id="ftab-text" role="tabpanel">

    <!-- Tagline -->
    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Tagline</h6>
        <form method="post" novalidate>
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="save_tagline">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">English 🇬🇧</label>
                    <input type="text" name="tagline_en" class="form-control" value="<?= h($taglineEn) ?>">
                </div>
                <div class="col-md-6">
                    <label class="form-label">French 🇫🇷</label>
                    <input type="text" name="tagline_fr" class="form-control" value="<?= h($taglineFr) ?>">
                </div>
            </div>
            <div class="mt-3">
                <button type="submit" class="btn btn-primary-altered btn-sm">
                    <i class="fa-solid fa-floppy-disk me-1"></i> Save
                </button>
            </div>
        </form>
    </div>

    <!-- Legal / Bottom bar -->
    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-1">Legal / Bottom bar</h6>
        <p class="text-muted small mb-3">
            Texts displayed in the bottom bar of the footer and on the fan badge. Leave blank to use default translations.
        </p>
        <form method="post" novalidate>
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="save_legal">
            <div class="row g-3 mb-3">
                <div class="col-12"><label class="form-label fw-semibold mb-1">Rights (© … All rights reserved.)</label></div>
                <div class="col-md-6">
                    <label class="form-label small">English 🇬🇧</label>
                    <input type="text" name="footer_rights_en" class="form-control" value="<?= h($rightsEn) ?>">
                </div>
                <div class="col-md-6">
                    <label class="form-label small">French 🇫🇷</label>
                    <input type="text" name="footer_rights_fr" class="form-control" value="<?= h($rightsFr) ?>">
                </div>
            </div>
            <div class="row g-3 mb-3">
                <div class="col-12"><label class="form-label fw-semibold mb-1">Fan badge label</label></div>
                <div class="col-md-6">
                    <label class="form-label small">English 🇬🇧</label>
                    <input type="text" name="footer_fan_label_en" class="form-control" value="<?= h($fanLabelEn) ?>">
                </div>
                <div class="col-md-6">
                    <label class="form-label small">French 🇫🇷</label>
                    <input type="text" name="footer_fan_label_fr" class="form-control" value="<?= h($fanLabelFr) ?>">
                </div>
            </div>
            <div class="row g-3 mb-3">
                <div class="col-12"><label class="form-label fw-semibold mb-1">Unofficial disclaimer</label></div>
                <div class="col-md-6">
                    <label class="form-label small">English 🇬🇧</label>
                    <input type="text" name="footer_unofficial_en" class="form-control" value="<?= h($unofficialEn) ?>">
                </div>
                <div class="col-md-6">
                    <label class="form-label small">French 🇫🇷</label>
                    <input type="text" name="footer_unofficial_fr" class="form-control" value="<?= h($unofficialFr) ?>">
                </div>
            </div>
            <button type="submit" class="btn btn-primary-altered btn-sm">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
        </form>
    </div>

</div><!-- /ftab-text -->

<!-- ── Tab: Columns (Titles + Content) ── -->
<div class="tab-pane fade pt-3" id="ftab-columns" role="tabpanel">

    <!-- Column titles -->
    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-1">Column titles</h6>
        <p class="text-muted small mb-3">Optional heading displayed above each footer column. Leave blank for no heading.</p>
        <form method="post" novalidate>
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="save_col_titles">
            <div class="row g-3">
                <?php for ($__c = 1; $__c <= 4; $__c++): ?>
                <div class="col-12">
                    <div class="fw-semibold mb-1" style="font-size:.85rem"><?= h($colLabels[$__c]) ?></div>
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label small">English 🇬🇧</label>
                            <input type="text" name="col<?= $__c ?>_title_en" class="form-control"
                                   value="<?= h($colTitles[$__c]['en']) ?>" placeholder="No heading">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small">French 🇫🇷</label>
                            <input type="text" name="col<?= $__c ?>_title_fr" class="form-control"
                                   value="<?= h($colTitles[$__c]['fr']) ?>" placeholder="No heading">
                        </div>
                    </div>
                </div>
                <?php endfor; ?>
            </div>
            <div class="mt-3">
                <button type="submit" class="btn btn-primary-altered btn-sm">
                    <i class="fa-solid fa-floppy-disk me-1"></i> Save
                </button>
            </div>
        </form>
    </div>

    <!-- Column content (TinyMCE) -->
    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-1">Column content</h6>
        <p class="text-muted small mb-3">
            Optional rich text / image per column, displayed below the title and above the links.
            Leave blank for no content.
        </p>
        <form method="post" novalidate id="form-col-content">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="save_col_content">
            <?php for ($__c = 1; $__c <= 4; $__c++): ?>
            <div class="mb-4<?= $__c < 4 ? ' pb-4' : '' ?>" style="<?= $__c < 4 ? 'border-bottom:1px solid var(--neutral-200)' : '' ?>">
                <div class="fw-semibold mb-2" style="font-size:.85rem"><?= h($colLabels[$__c]) ?></div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small">English 🇬🇧</label>
                        <textarea name="col<?= $__c ?>_content_en"
                                  class="tinymce-footer" rows="5"><?= h($colContents[$__c]['en']) ?></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small">French 🇫🇷</label>
                        <textarea name="col<?= $__c ?>_content_fr"
                                  class="tinymce-footer" rows="5"><?= h($colContents[$__c]['fr']) ?></textarea>
                    </div>
                </div>
            </div>
            <?php endfor; ?>
            <div class="mt-3">
                <button type="submit" class="btn btn-primary-altered btn-sm">
                    <i class="fa-solid fa-floppy-disk me-1"></i> Save
                </button>
            </div>
        </form>
    </div>

</div><!-- /ftab-columns -->

<!-- ── Tab: Decoration ── -->
<div class="tab-pane fade pt-3" id="ftab-deco" role="tabpanel">

<?php
$_ftBgNow    = getSetting('footer_bg_image');
$_ftBgMode   = getSetting('footer_bg_mode') ?: 'cover';
$_ftDecoLNow = getSetting('footer_deco_left');
$_ftDecoLOp  = getSetting('footer_deco_left_opacity') !== '' ? (int)getSetting('footer_deco_left_opacity') : 100;
$_ftDecoRNow = getSetting('footer_deco_right');
$_ftDecoROp  = getSetting('footer_deco_right_opacity') !== '' ? (int)getSetting('footer_deco_right_opacity') : 100;
?>
<div class="card-altered p-3 mb-4">
    <h6 class="fw-bold mb-1"><i class="fa-solid fa-image me-1 text-muted"></i>Decoration images</h6>
    <p class="text-muted small mb-3">
        Optional images displayed in the footer background and on its left/right sides. Use PNG with transparency for best results.
    </p>
    <form method="post" novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_deco">

        <div class="row g-4">

            <!-- Background -->
            <div class="col-12">
                <div class="fw-semibold mb-2" style="font-size:.85rem">Background image</div>
                <div class="row g-3 align-items-end">
                    <div class="col-md-6">
                        <div class="img-picker-widget"
                             data-input="ft_bg_inp"
                             data-preview="ft_bg_prev"
                             data-folder="footer"
                             data-base-url="<?= BASE_URL ?>"
                             data-csrf="<?= h(csrfToken()) ?>"
                             data-original="<?= h($_ftBgNow ?? '') ?>"
                             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                            <div id="ft_bg_prev" class="mb-2" style="<?= $_ftBgNow ? '' : 'display:none' ?>">
                                <div style="position:relative;display:inline-block">
                                    <img src="<?= $_ftBgNow ? h(BASE_URL . '/' . $_ftBgNow) : '' ?>" alt=""
                                         style="max-height:60px;border-radius:6px;border:1px solid var(--neutral-200)">
                                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                                </div>
                            </div>
                            <input type="hidden" name="footer_bg_image_picker" id="ft_bg_inp" value="<?= h($_ftBgNow ?? '') ?>">
                            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                                <i class="fa-solid fa-images me-1"></i> Choose image
                            </button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small">Mode</label>
                        <select name="footer_bg_mode" class="form-select form-select-sm">
                            <option value="cover"<?= $_ftBgMode === 'cover' ? ' selected' : '' ?>>Cover</option>
                            <option value="repeat"<?= $_ftBgMode === 'repeat' ? ' selected' : '' ?>>Repeat (tile)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Deco left -->
            <div class="col-md-6" style="border-top:1px solid var(--neutral-100);padding-top:1.25rem">
                <div class="fw-semibold mb-2" style="font-size:.85rem">Left decoration</div>
                <div class="mb-3 img-picker-widget"
                     data-input="ft_dl_inp"
                     data-preview="ft_dl_prev"
                     data-folder="footer"
                     data-base-url="<?= BASE_URL ?>"
                     data-csrf="<?= h(csrfToken()) ?>"
                     data-original="<?= h($_ftDecoLNow ?? '') ?>"
                     data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                    <div id="ft_dl_prev" class="mb-2" style="<?= $_ftDecoLNow ? '' : 'display:none' ?>">
                        <div style="position:relative;display:inline-block">
                            <img src="<?= $_ftDecoLNow ? h(BASE_URL . '/' . $_ftDecoLNow) : '' ?>" alt=""
                                 style="max-height:60px;border-radius:6px;border:1px solid var(--neutral-200)">
                            <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                    style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                        </div>
                    </div>
                    <input type="hidden" name="footer_deco_left_picker" id="ft_dl_inp" value="<?= h($_ftDecoLNow ?? '') ?>">
                    <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                        <i class="fa-solid fa-images me-1"></i> Choose image
                    </button>
                </div>
                <label class="form-label small">
                    Opacity: <span id="deco-l-pct"><?= $_ftDecoLOp ?></span>%
                </label>
                <input type="range" name="footer_deco_left_opacity" id="deco-l-range"
                       class="form-range" min="0" max="100" step="5" value="<?= $_ftDecoLOp ?>">
            </div>

            <!-- Deco right -->
            <div class="col-md-6" style="border-top:1px solid var(--neutral-100);padding-top:1.25rem">
                <div class="fw-semibold mb-2" style="font-size:.85rem">Right decoration</div>
                <div class="mb-3 img-picker-widget"
                     data-input="ft_dr_inp"
                     data-preview="ft_dr_prev"
                     data-folder="footer"
                     data-base-url="<?= BASE_URL ?>"
                     data-csrf="<?= h(csrfToken()) ?>"
                     data-original="<?= h($_ftDecoRNow ?? '') ?>"
                     data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                    <div id="ft_dr_prev" class="mb-2" style="<?= $_ftDecoRNow ? '' : 'display:none' ?>">
                        <div style="position:relative;display:inline-block">
                            <img src="<?= $_ftDecoRNow ? h(BASE_URL . '/' . $_ftDecoRNow) : '' ?>" alt=""
                                 style="max-height:60px;border-radius:6px;border:1px solid var(--neutral-200)">
                            <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                    style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                        </div>
                    </div>
                    <input type="hidden" name="footer_deco_right_picker" id="ft_dr_inp" value="<?= h($_ftDecoRNow ?? '') ?>">
                    <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                        <i class="fa-solid fa-images me-1"></i> Choose image
                    </button>
                </div>
                <label class="form-label small">
                    Opacity: <span id="deco-r-pct"><?= $_ftDecoROp ?></span>%
                </label>
                <input type="range" name="footer_deco_right_opacity" id="deco-r-range"
                       class="form-range" min="0" max="100" step="5" value="<?= $_ftDecoROp ?>">
            </div>

        </div>

        <div class="mt-3">
            <button type="submit" class="btn btn-primary-altered btn-sm">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
        </div>
    </form>
</div>
<script>
['deco-l','deco-r'].forEach(function(id) {
    var range = document.getElementById(id + '-range');
    var pct   = document.getElementById(id + '-pct');
    if (range && pct) range.addEventListener('input', function() { pct.textContent = this.value; });
});
</script>

</div><!-- /ftab-deco -->

<!-- ── Tab: Links ── -->
<div class="tab-pane fade pt-3" id="ftab-links" role="tabpanel">

    <?php foreach ($colLabels as $colNum => $colLabel): ?>
    <div class="card-altered mb-3">
        <div class="d-flex align-items-center justify-content-between p-3 mb-0">
            <h6 class="fw-bold mb-0">
                <i class="fa-solid fa-link me-1 text-muted"></i>
                <?= h($colLabel) ?>
            </h6>
            <a href="<?= BASE_URL ?>/admin/footer-link-edit?col=<?= $colNum ?>"
               class="btn btn-primary-altered btn-sm">
                <i class="fa-solid fa-plus me-1"></i> Add
            </a>
        </div>

        <?php if (empty($linksByCol[$colNum])): ?>
            <p class="text-muted small px-3 pb-3 mb-0">No links in this column.</p>
        <?php else: ?>
            <?php $colTotal = count($linksByCol[$colNum]); ?>
            <div class="table-responsive">
            <table class="table table-hover table-altered mb-0">
                <thead>
                    <tr>
                        <th>Label EN</th>
                        <th>Label FR</th>
                        <th>URL</th>
                        <th>Icon</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($linksByCol[$colNum] as $lnkIdx => $link): ?>
                    <tr>
                        <td><?= h($link['label_en']) ?></td>
                        <td><?= h($link['label_fr']) ?></td>
                        <td class="text-muted small"><?= h($link['url']) ?></td>
                        <td><?php if (!empty($link['icon'])): ?><i class="<?= h($link['icon']) ?>"></i><?php endif; ?></td>
                        <td class="text-end" style="white-space:nowrap">
                            <!-- Move up -->
                            <form method="post" class="d-inline">
                                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                                <input type="hidden" name="action" value="move_link_up">
                                <input type="hidden" name="link_id" value="<?= $link['id'] ?>">
                                <button type="submit" class="btn btn-outline-secondary btn-sm" <?= $lnkIdx === 0 ? 'disabled' : '' ?> title="Move up">
                                    <i class="fa-solid fa-chevron-up"></i>
                                </button>
                            </form>
                            <!-- Move down -->
                            <form method="post" class="d-inline">
                                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                                <input type="hidden" name="action" value="move_link_down">
                                <input type="hidden" name="link_id" value="<?= $link['id'] ?>">
                                <button type="submit" class="btn btn-outline-secondary btn-sm" <?= $lnkIdx === $colTotal - 1 ? 'disabled' : '' ?> title="Move down">
                                    <i class="fa-solid fa-chevron-down"></i>
                                </button>
                            </form>
                            <!-- Edit -->
                            <a href="<?= BASE_URL ?>/admin/footer-link-edit?id=<?= $link['id'] ?>"
                               class="btn btn-outline-primary btn-sm" title="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </a>
                            <!-- Delete -->
                            <?php if (adminCanDelete()): ?>
                            <form method="post" class="d-inline" onsubmit="return confirm('Delete this link?')">
                                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                                <input type="hidden" name="action" value="delete_link">
                                <input type="hidden" name="link_id" value="<?= $link['id'] ?>">
                                <button type="submit" class="btn btn-outline-danger btn-sm" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            </div>
        <?php endif; ?>
    </div>
    <?php endforeach; ?>

</div><!-- /ftab-links -->

</div><!-- /tab-content -->

<script>
(function () {
    var key    = 'admin-footer-tab';
    var tabs   = document.getElementById('footer-tabs');
    var stored = localStorage.getItem(key);
    if (stored) {
        var el = tabs.querySelector('[data-bs-target="' + stored + '"]');
        if (el) bootstrap.Tab.getOrCreateInstance(el).show();
    }
    tabs.querySelectorAll('[data-bs-toggle="tab"]').forEach(function (btn) {
        btn.addEventListener('shown.bs.tab', function (e) {
            var target = e.target.getAttribute('data-bs-target');
            localStorage.setItem(key, target);
            // TinyMCE editors inside the Columns tab may need a layout refresh
            if (target === '#ftab-columns' && typeof tinymce !== 'undefined') {
                setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
            }
        });
    });
})();
</script>

<?php $__tinymce_footer = true; require_once __DIR__ . '/includes/footer.php'; ?>
