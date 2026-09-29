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
            <div class="mb-4<?= $__c < 4 ? ' pb-4' : '' ?>" style="<?= $__c < 4 ? 'border-bottom:1px solid var(--ac-color-border)' : '' ?>">
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
                        <td><?php if (!empty($link['icon'])): ?><?= ac_icon((string)($link['icon'])) ?><?php endif; ?></td>
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
