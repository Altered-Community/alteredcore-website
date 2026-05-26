<?php
require_once __DIR__ . '/../includes/functions.php';
$uiLang = getUiLang();

// auth
if (!kcIsLoggedIn()) {
    redirect(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? ''));
}
$userId = (int)($_SESSION['user_id'] ?? 0);
if (!$userId) {
    redirect(BASE_URL . '/pages/login');
}

// translations
$txt = [
    'en' => [
        'page_title'    => 'My Collection',
        'intro'         => 'Paste or type your collection below. One card per line: quantity followed by the card reference.',
        'format_hint'   => 'Example: 3 ALT_CORE_B_AX_01_C',
        'textarea_ph'   => "3 ALT_CORE_B_AX_01_C\n1 ALT_EOLE_B_LY_15_R\n…",
        'save_btn'      => 'Save collection',
        'clear_btn'     => 'Clear collection',
        'clear_confirm' => 'Clear your entire collection? This cannot be undone.',
        'saved_ok'      => 'Collection saved.',
        'cleared_ok'    => 'Collection cleared.',
        'last_updated'  => 'Last updated:',
        'card_lines'    => '%d card reference(s)',
        'empty'         => 'Your collection is empty.',
        'back_cards'    => 'Cards',
        'browse_coll'   => 'Browse my collection',
        'db_error'      => 'Could not load your collection. Please try again later.',
        'saving'        => 'Saving…',
        'clearing'      => 'Clearing…',
        'total_cards'   => '%d card(s)',
        'disclaimer'    => 'This collection is not intended to prove card ownership. It is only used to filter the card search engine to your cards.',
        'disclaimer_btn'=> 'I understand',
        'tab_collection'      => 'Physical Collection',
        'tab_ownership'       => 'Digital Ownership',
        'ownership_msg'       => 'Digital card ownership is not yet managed on this platform. This feature is planned for a future update.',
        'ownership_data_title'=> 'Your ownership data',
        'ownership_data_empty'=> 'No ownership data found.',
        'ownership_data_err'  => 'Could not load ownership data.',
        'physical_disclaimer' => 'This collection is only for tracking your physical card collection. It does not represent digital ownership or any rights over the cards.',
        'import_title'       => 'Import from Altered.gg',
        'import_intro'       => 'To import your card collection from Altered.gg, export your personal data from <a href="https://altered.gg/manage-account/personal-data" target="_blank" rel="noopener">altered.gg/manage-account/personal-data</a>, then import the downloaded ZIP file here.',
        'import_btn'         => 'Import',
        'import_loading'     => 'Importing…',
        'import_confirm'     => 'This will replace your entire current collection. Continue?',
        'import_err'         => 'Could not read the ZIP file.',
        'import_err_size'    => 'The ZIP file must be less than 500 KB.',
        'import_err_no_coll' => 'File clear/collection.csv not found in this ZIP.',
        'import_err_prepare' => 'Import failed. Please try again.',
        'import_err_batch'   => 'Import failed. Please try again.',
    ],
    'fr' => [
        'page_title'    => 'Ma Collection',
        'intro'         => 'Collez ou saisissez votre collection ci-dessous. Une carte par ligne : quantité suivie de la référence.',
        'format_hint'   => 'Exemple : 3 ALT_CORE_B_AX_01_C',
        'textarea_ph'   => "3 ALT_CORE_B_AX_01_C\n1 ALT_EOLE_B_LY_15_R\n…",
        'save_btn'      => 'Enregistrer la collection',
        'clear_btn'     => 'Vider la collection',
        'clear_confirm' => 'Vider toute votre collection ? Cette action est irréversible.',
        'saved_ok'      => 'Collection enregistrée.',
        'cleared_ok'    => 'Collection vidée.',
        'last_updated'  => 'Mis à jour le :',
        'card_lines'    => '%d référence(s)',
        'empty'         => 'Votre collection est vide.',
        'back_cards'    => 'Cartes',
        'browse_coll'   => 'Parcourir ma collection',
        'db_error'      => 'Impossible de charger votre collection. Veuillez réessayer plus tard.',
        'saving'        => 'Enregistrement…',
        'clearing'      => 'Suppression…',
        'total_cards'   => '%d carte(s)',
        'disclaimer'    => 'Cette collection ne sert pas à prouver la possession de cartes. Elle est uniquement utilisée pour filtrer le moteur de recherche de cartes sur votre collection.',
        'disclaimer_btn'=> 'Je comprends',
        'physical_disclaimer' => 'Cette collection sert uniquement à suivre votre collection physique de cartes. Elle ne représente en aucun cas une propriété numérique ou un quelconque droit sur les cartes.',
        'import_title'       => 'Importer depuis Altered.gg',
        'import_intro'       => 'Pour importer votre collection de cartes depuis Altered.gg, exportez vos données personnelles depuis <a href="https://altered.gg/manage-account/personal-data" target="_blank" rel="noopener">altered.gg/manage-account/personal-data</a>, puis importez le fichier ZIP téléchargé ici.',
        'import_btn'         => 'Importer',
        'import_loading'     => 'Importation…',
        'import_confirm'     => 'Ceci remplacera toute votre collection actuelle. Continuer ?',
        'import_err'         => 'Impossible de lire le fichier ZIP.',
        'import_err_size'    => 'Le fichier ZIP doit faire moins de 500 Ko.',
        'import_err_no_coll' => 'Fichier clear/collection.csv introuvable dans ce ZIP.',
        'import_err_prepare' => 'L\'importation a échoué. Veuillez réessayer.',
        'import_err_batch'   => 'L\'importation a échoué. Veuillez réessayer.',
        'tab_collection'      => 'Collection Physique',
        'tab_ownership'       => 'Propriété Numérique',
        'ownership_msg'       => 'La propriété numérique des cartes n\'est pas encore gérée sur cette plateforme. Cette fonctionnalité est prévue pour une prochaine mise à jour.',
        'ownership_data_title'=> 'Vos données de propriété',
        'ownership_data_empty'=> 'Aucune donnée de propriété trouvée.',
        'ownership_data_err'  => 'Impossible de charger les données de propriété.',
    ],
][$uiLang] ?? [];

// helpers
// Decode the stored JSON string into a {ref => qty} map.
function _coll_decode(string $json): array {
    if ($json === '' || $json === '{}') return [];
    $d = json_decode($json, true);
    return is_array($d) ? $d : [];
}

// Convert a {ref => qty} map to human-readable text (one "QTY REF" per line).
function _coll_to_text(array $map): string {
    $lines = [];
    foreach ($map as $ref => $qty) {
        if ($qty > 0) $lines[] = $qty . ' ' . $ref;
    }
    sort($lines);
    return implode("\n", $lines);
}

// Parse "QTY REF" text into a {ref => qty} map.
function _coll_from_text(string $text): array {
    $map = [];
    foreach (explode("\n", $text) as $line) {
        $line = trim($line);
        if ($line === '') continue;
        if (preg_match('/^(\d+)\s+(ALT_[A-Z0-9_]+)$/i', $line, $m)) {
            $ref = strtoupper($m[2]);
            $qty = (int)$m[1];
            if ($qty > 0 && strpos($ref, 'FOILER') === false) $map[$ref] = min(99, $qty);
        }
    }
    return $map;
}

// Retry wrapper: up to 3 attempts with a 1-second pause between each.
function _collApiRetry(string $apiUrl, string $method, string $path, int $userId, $body = null): bool {
    for ($i = 0; $i < 3; $i++) {
        $r = collApiRequest($apiUrl, $method, $path, $userId, $body);
        if ($r !== false) return true;
        if ($i < 2) sleep(1);
    }
    error_log("collApi $method $path failed after 3 attempts");
    return false;
}

// Like collApiRequest but returns ['ok', 'code', 'body'] for detailed error reporting.
function _collApiFetch(string $method, string $path, int $userId, $body = null): array {
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return ['ok' => false, 'code' => 0, 'body' => 'no_token'];

    $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
    if ($body !== null) $headers[] = 'Content-Type: application/json';

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
        CURLOPT_CUSTOMREQUEST  => $method,
    ];
    if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);

    $ch = curl_init(COLLECTION_API_URL . $path);
    curl_setopt_array($ch, $opts);
    $raw  = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_errno($ch);
    curl_close($ch);

    return ['ok' => !$err && $code < 400, 'code' => $code, 'body' => is_string($raw) ? substr($raw, 0, 500) : ''];
}

// pOST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $isAjax = in_array($_POST['action'] ?? '', ['set_qty', 'import_prepare', 'import_batch', 'import_finish']);

    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        if ($isAjax) {
            header('Content-Type: application/json');
            echo json_encode(['ok' => false, 'error' => 'Invalid token']);
            exit;
        }
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/pages/collection');
    }

    $action = $_POST['action'] ?? '';

    // aJAX: update a single card's quantity
    if ($action === 'set_qty') {
        header('Content-Type: application/json');
        $ref     = strtoupper(trim($_POST['ref'] ?? ''));
        $qty     = max(0, min(99, (int)($_POST['qty'] ?? 0)));
        $entryId = (int)($_POST['entry_id'] ?? 0);
        if (!preg_match('/^ALT_[A-Z0-9_]+$/', $ref)) {
            echo json_encode(['ok' => false, 'error' => 'Invalid ref']);
            exit;
        }
        if ($entryId > 0 && $qty === 0) {
            $r = collApiRequest(COLLECTION_API_URL, 'DELETE', '/api/collection/' . $entryId, $userId);
            echo json_encode(['ok' => $r !== false, 'ref' => $ref, 'qty' => 0, 'entry_id' => 0]);
        } elseif ($entryId > 0) {
            $r = collApiRequest(COLLECTION_API_URL, 'PATCH', '/api/collection/' . $entryId, $userId,
                ['quantity' => $qty], 'application/merge-patch+json');
            echo json_encode(['ok' => is_array($r), 'ref' => $ref, 'qty' => $qty, 'entry_id' => $entryId]);
        } else {
            $r = collApiRequest(COLLECTION_API_URL, 'POST', '/api/collection', $userId,
                ['cardReference' => $ref, 'quantity' => $qty, 'isFoil' => false]);
            if (is_array($r)) {
                echo json_encode(['ok' => true, 'ref' => $ref, 'qty' => $qty, 'entry_id' => (int)($r['id'] ?? 0)]);
            } else {
                echo json_encode(['ok' => false, 'error' => 'API error']);
            }
        }
        unset($_SESSION['_coll_' . $userId], $_SESSION['_coll_ts_' . $userId]);
        exit;
    }

    // aJAX: import step 1 — clear existing API entries
    if ($action === 'import_prepare') {
        header('Content-Type: application/json');
        $existing = collApiRequest(COLLECTION_API_URL, 'GET', '/api/collection', $userId);
        if ($existing === false) { echo json_encode(['ok' => false, 'error' => 'api_get']); exit; }
        if (!empty($existing)) {
            $ids = [];
            foreach ($existing as $e) {
                $id = (int)($e['id'] ?? 0);
                if ($id > 0) $ids[] = $id;
            }
            foreach (array_chunk($ids, 100) as $chunk) {
                if (!_collApiRetry(COLLECTION_API_URL, 'DELETE', '/api/collection/batch', $userId, ['ids' => $chunk])) {
                    echo json_encode(['ok' => false, 'error' => 'api_delete']); exit;
                }
            }
        }
        echo json_encode(['ok' => true]);
        exit;
    }

    // aJAX: import step 2 — post one batch of 100 cards
    if ($action === 'import_batch') {
        header('Content-Type: application/json');
        $cards = json_decode($_POST['cards'] ?? '[]', true);
        if (!is_array($cards) || empty($cards)) {
            echo json_encode(['ok' => false, 'error' => 'invalid']); exit;
        }
        $lastCode = 0;
        $lastBody = '';
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $r = _collApiFetch('POST', '/api/collection/batch', $userId, ['cards' => $cards]);
            if ($r['ok']) { echo json_encode(['ok' => true]); exit; }
            $lastCode = $r['code'];
            $lastBody = $r['body'];
            if ($attempt < 2) sleep(1);
        }
        error_log("import_batch failed: HTTP $lastCode — $lastBody");
        echo json_encode(['ok' => false, 'error' => 'api_post', 'http' => $lastCode, 'api_response' => $lastBody]);
        exit;
    }

    // aJAX: import step 3 — invalidate session cache
    if ($action === 'import_finish') {
        header('Content-Type: application/json');
        unset($_SESSION['_coll_' . $userId], $_SESSION['_coll_ts_' . $userId]);
        flash($txt['saved_ok'] ?? 'Saved.');
        echo json_encode(['ok' => true]);
        exit;
    }

    // save full collection from textarea
    if ($action === 'save') {
        $raw    = $_POST['collection'] ?? '';
        $raw    = str_replace(["\r\n", "\r"], "\n", $raw);
        $newMap = _coll_from_text(trim($raw));

        $existing = collApiRequest(COLLECTION_API_URL, 'GET', '/api/collection', $userId);
        if ($existing === false) {
            flash($txt['db_error'] ?? 'Error', 'error');
            redirect(BASE_URL . '/pages/collection');
        }
        if (!empty($existing)) {
            $ids = [];
            foreach ($existing as $e) {
                $id = (int)($e['id'] ?? 0);
                if ($id > 0) $ids[] = $id;
            }
            foreach (array_chunk($ids, 100) as $chunk) {
                if (!_collApiRetry(COLLECTION_API_URL, 'DELETE', '/api/collection/batch', $userId, ['ids' => $chunk])) {
                    flash($txt['db_error'] ?? 'Error', 'error');
                    redirect(BASE_URL . '/pages/collection');
                }
            }
        }
        $toCreate = [];
        foreach ($newMap as $ref => $qty) {
            $toCreate[] = ['cardReference' => $ref, 'quantity' => $qty, 'isFoil' => false];
        }
        foreach (array_chunk($toCreate, 100) as $chunk) {
            if (!_collApiRetry(COLLECTION_API_URL, 'POST', '/api/collection/batch', $userId, ['cards' => $chunk])) {
                flash($txt['db_error'] ?? 'Error', 'error');
                redirect(BASE_URL . '/pages/collection');
            }
        }
        unset($_SESSION['_coll_' . $userId], $_SESSION['_coll_ts_' . $userId]);
        flash($txt['saved_ok'] ?? 'Saved.');
        redirect(BASE_URL . '/pages/collection');
    }

    // clear collection
    if ($action === 'clear') {
        $existing = collApiRequest(COLLECTION_API_URL, 'GET', '/api/collection', $userId);
        if (is_array($existing) && !empty($existing)) {
            $ids = [];
            foreach ($existing as $e) {
                $id = (int)($e['id'] ?? 0);
                if ($id > 0) $ids[] = $id;
            }
            foreach (array_chunk($ids, 100) as $chunk) {
                if (!_collApiRetry(COLLECTION_API_URL, 'DELETE', '/api/collection/batch', $userId, ['ids' => $chunk])) {
                    flash($txt['db_error'] ?? 'Error', 'error');
                    redirect(BASE_URL . '/pages/collection');
                }
            }
        }
        unset($_SESSION['_coll_' . $userId], $_SESSION['_coll_ts_' . $userId]);
        flash($txt['cleared_ok'] ?? 'Cleared.');
        redirect(BASE_URL . '/pages/collection');
    }
}

// load current collection
$collMap   = [];
$updatedAt = null;
$loadError = false;

$entries = collApiRequest(COLLECTION_API_URL, 'GET', '/api/collection', $userId);
if ($entries === false) {
    $loadError = true;
} else {
    foreach ($entries as $entry) {
        $ref = $entry['cardReference'] ?? '';
        $qty = (int)($entry['quantity'] ?? 0);
        if ($ref && $qty > 0) $collMap[$ref] = $qty;
        $ua = $entry['updatedAt'] ?? $entry['createdAt'] ?? null;
        if ($ua && (!$updatedAt || $ua > $updatedAt)) $updatedAt = $ua;
    }
}

$collection = _coll_to_text($collMap);
$lineCount  = count($collMap);
$totalQty   = 0;
$byRarity   = ['C' => 0, 'R' => 0, 'E' => 0, 'U' => 0];
foreach ($collMap as $ref => $qty) {
    $totalQty += $qty;
    switch (explode('_', $ref)[5] ?? '') {
        case 'C':  $byRarity['C'] += $qty; break;
        case 'R1': $byRarity['R'] += $qty; break;
        case 'R2': $byRarity['E'] += $qty; break;
        case 'U':  $byRarity['U'] += $qty; break;
    }
}

// ownership data fetch — disabled for now

$pageTitle = $txt['page_title'] ?? 'Collection';
?>

<div class="container py-4" style="max-width:640px">

    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
        <a href="<?= BASE_URL ?>/pages/cards" class="btn btn-outline-secondary btn-sm">
            <i class="fa-solid fa-arrow-left me-1"></i><?= h($txt['back_cards'] ?? 'Cards') ?>
        </a>
    </div>

    <?php if ($flash = getFlash()): ?>
    <div class="alert alert-<?= $flash['type'] === 'error' ? 'danger' : 'success' ?> py-2">
        <?= h($flash['msg']) ?>
    </div>
    <?php endif; ?>

    <?php if ($loadError): ?>
    <div class="alert alert-danger py-2"><?= h($txt['db_error'] ?? 'Error') ?></div>
    <?php endif; ?>

    <div class="ac-tab-toggle">
        <button type="button" class="btn-toggle coll-tab-btn active" data-pane="collection">
            <i class="fa-solid fa-layer-group me-1"></i><?= h($txt['tab_collection'] ?? 'Digital Collection') ?>
        </button>
        <button type="button" class="btn-toggle coll-tab-btn" data-pane="ownership">
            <i class="fa-solid fa-key me-1"></i><?= h($txt['tab_ownership'] ?? 'Ownership') ?>
        </button>
    </div>
    <div id="coll-pane-collection">

    <!-- Physical collection disclaimer -->
    <div class="card-altered p-3 mb-3 coll-card-success">
        <div class="d-flex align-items-start gap-2">
            <i class="fa-solid fa-circle-info mt-1 flex-shrink-0" style="color:#22c55e"></i>
            <p class="mb-0 small" style="color:var(--neutral-600);line-height:1.55">
                <?= h($txt['physical_disclaimer']) ?>
            </p>
        </div>
    </div>

    <!-- Altered.gg ZIP import -->
    <div class="card-altered p-3 mb-3 coll-card-primary">
        <div class="d-flex align-items-center gap-2 mb-2">
            <i class="fa-solid fa-file-zipper" style="color:var(--primary-400)"></i>
            <span class="fw-bold small" style="color:var(--neutral-700)"><?= h($txt['import_title']) ?></span>
        </div>
        <p class="mb-3 small" style="color:var(--neutral-500);line-height:1.55">
            <?= $txt['import_intro'] ?>
        </p>
        <div class="d-flex align-items-center gap-2 flex-wrap">
            <input type="file" id="coll-zip-input" accept=".zip"
                   class="form-control form-control-sm" style="max-width:280px">
            <button type="button" id="coll-zip-btn" class="btn btn-primary-altered btn-sm">
                <i class="fa-solid fa-file-import me-1"></i><?= h($txt['import_btn']) ?>
            </button>
        </div>
        <div id="coll-zip-status" class="mt-2 small" style="display:none"></div>
    </div>

    <div id="coll-disclaimer" class="card-altered p-3 mb-3 coll-card-warning">
        <p class="mb-3 small" style="color:var(--neutral-600);line-height:1.55">
            <i class="fa-solid fa-circle-info me-2" style="color:var(--bs-warning,#ffc107)"></i><?= h($txt['disclaimer'] ?? '') ?>
        </p>
        <button type="button" id="coll-disclaimer-btn" class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-check me-1"></i><?= h($txt['disclaimer_btn'] ?? 'I understand') ?>
        </button>
    </div>

    <div id="coll-form-wrap" class="card-altered p-4 mb-3" style="display:none">
        <p class="text-muted mb-1" style="font-size:.88rem"><?= h($txt['intro'] ?? '') ?></p>
        <p class="mb-3" style="font-size:.82rem;color:var(--neutral-400)">
            <code><?= h($txt['format_hint'] ?? '') ?></code>
        </p>

        <form method="post">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="save">

            <textarea name="collection" class="form-control font-monospace mb-3"
                      rows="10" style="font-size:.82rem;resize:vertical"
                      placeholder="<?= h($txt['textarea_ph'] ?? '') ?>"><?= h($collection) ?></textarea>

            <div class="d-flex align-items-center gap-2 flex-wrap">
                <button type="submit" class="btn btn-primary-altered btn-sm">
                    <i class="fa-solid fa-floppy-disk me-1"></i><?= h($txt['save_btn'] ?? 'Save') ?>
                </button>
                <?php if ($lineCount > 0): ?>
                <button type="button" class="btn btn-outline-danger btn-sm"
                        onclick="if(confirm(<?= h(json_encode($txt['clear_confirm'] ?? 'Clear?')) ?>)) document.getElementById('coll-clear-form').submit()">
                    <i class="fa-solid fa-trash me-1"></i><?= h($txt['clear_btn'] ?? 'Clear') ?>
                </button>
                <a href="<?= BASE_URL ?>/pages/cards?scope=collection" class="btn btn-outline-secondary btn-sm">
                    <i class="fa-solid fa-magnifying-glass me-1"></i><?= h($txt['browse_coll'] ?? 'Browse my collection') ?>
                </a>
                <?php endif; ?>

                <?php if ($lineCount > 0): ?>
                <span class="ms-auto text-muted text-end" style="font-size:.82rem;line-height:1.7">
                    <?= h(sprintf($txt['card_lines'] ?? '%d ref(s)', $lineCount)) ?>
                    &nbsp;·&nbsp; <?= h(sprintf($txt['total_cards'] ?? '%d card(s)', $totalQty)) ?>
                    <?php if ($updatedAt): ?>
                    &nbsp;·&nbsp; <?= h($txt['last_updated'] ?? 'Updated:') ?> <?= h(date('d/m/Y H:i', strtotime($updatedAt))) ?>
                    <?php endif; ?>
                    <br>
                    C&nbsp;<?= $byRarity['C'] ?> &nbsp;·&nbsp;
                    R&nbsp;<?= $byRarity['R'] ?> &nbsp;·&nbsp;
                    E&nbsp;<?= $byRarity['E'] ?> &nbsp;·&nbsp;
                    U&nbsp;<?= $byRarity['U'] ?>
                </span>
                <?php elseif ($updatedAt): ?>
                <span class="ms-auto text-muted" style="font-size:.82rem">
                    <?= h($txt['last_updated'] ?? 'Updated:') ?> <?= h(date('d/m/Y H:i', strtotime($updatedAt))) ?>
                </span>
                <?php endif; ?>
            </div>
        </form>
    </div>

    </div><!-- /coll-pane-collection -->

    <div id="coll-pane-ownership" style="display:none">
        <div class="card-altered p-3 mb-3 coll-card-neutral">
            <div class="d-flex align-items-start gap-2">
                <i class="fa-solid fa-clock mt-1 flex-shrink-0 text-secondary" style="font-size:.9rem"></i>
                <p class="mb-0 small" style="color:var(--neutral-600);line-height:1.55">
                    <?= h($txt['ownership_msg'] ?? 'Digital card ownership is not yet managed on this platform. This feature is planned for a future update.') ?>
                </p>
            </div>
        </div>

    </div><!-- /coll-pane-ownership -->

</div>

<form id="coll-clear-form" method="post" style="display:none">
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="clear">
</form>

<script>
(function () {
    var LS_KEY     = 'coll_disclaimer_ok';
    var disclaimer = document.getElementById('coll-disclaimer');
    var formWrap   = document.getElementById('coll-form-wrap');
    var btn        = document.getElementById('coll-disclaimer-btn');

    function showForm() {
        if (disclaimer) disclaimer.style.display = 'none';
        if (formWrap)   formWrap.style.display   = '';
    }

    window.collShowForm = function () {
        localStorage.setItem(LS_KEY, '1');
        showForm();
    };

    if (localStorage.getItem(LS_KEY)) {
        showForm();
    }

    if (btn) {
        btn.addEventListener('click', function () {
            localStorage.setItem(LS_KEY, '1');
            showForm();
        });
    }

    var msgSave  = <?= json_encode($txt['saving']   ?? 'Saving…') ?>;
    var msgClear = <?= json_encode($txt['clearing'] ?? 'Clearing…') ?>;
    document.querySelectorAll('form[method="post"]').forEach(function (f) {
        f.addEventListener('submit', function () {
            var act = f.querySelector('input[name="action"]');
            window.acSpinner.show((act && act.value === 'clear') ? msgClear : msgSave);
        });
    });
    window.addEventListener('pageshow', function () { window.acSpinner.hide(); });

    document.querySelectorAll('.coll-tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.coll-tab-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var pane = btn.dataset.pane;
            document.getElementById('coll-pane-collection').style.display = pane === 'collection' ? '' : 'none';
            document.getElementById('coll-pane-ownership').style.display  = pane === 'ownership'  ? '' : 'none';
        });
    });
}());
</script>

<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" defer></script>
<script>
(function () {
    var zipInput  = document.getElementById('coll-zip-input');
    var zipBtn    = document.getElementById('coll-zip-btn');
    var zipStatus = document.getElementById('coll-zip-status');
    var textarea  = document.querySelector('textarea[name="collection"]');

    var msgLoading = <?= json_encode($txt['import_loading'] ?? 'Importing…') ?>;
    var msgSave    = <?= json_encode($txt['saving']        ?? 'Saving…') ?>;
    var msgConfirm = <?= json_encode($txt['import_confirm']     ?? 'This will replace your collection. Continue?') ?>;
    var msgErr        = <?= json_encode($txt['import_err']         ?? 'Error reading ZIP') ?>;
    var msgErrSize    = <?= json_encode($txt['import_err_size']    ?? 'ZIP must be < 500 KB') ?>;
    var msgNoColl     = <?= json_encode($txt['import_err_no_coll'] ?? 'clear/collection.csv not found') ?>;
    var msgErrPrepare = <?= json_encode($txt['import_err_prepare'] ?? 'Could not clear collection via API.') ?>;
    var msgErrBatch   = <?= json_encode($txt['import_err_batch']   ?? 'API error on batch') ?>;
    var pageUrl    = <?= json_encode(BASE_URL . '/pages/collection') ?>;

    function hideLoading() { window.acSpinner.hide(); }

    function showStatus(msg, isErr) {
        if (!zipStatus) return;
        zipStatus.textContent = msg;
        zipStatus.style.color = isErr ? '#ef4444' : '#22c55e';
        zipStatus.style.display = '';
    }

    function ajaxPost(data) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', pageUrl, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onload = function () {
                try { resolve(JSON.parse(xhr.responseText)); }
                catch (e) { reject(new Error('bad json')); }
            };
            xhr.onerror = function () { reject(new Error('network')); };
            xhr.send(Object.keys(data).map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
            }).join('&'));
        });
    }

    // Parse a single semicolon-delimited CSV line, handling double-quoted fields.
    function parseCSVLine(line) {
        var fields = [], i = 0, len = line.length, field = '';
        while (i < len) {
            if (line[i] === '"') {
                i++;
                while (i < len) {
                    if (line[i] === '"') {
                        if (line[i + 1] === '"') { field += '"'; i += 2; }
                        else { i++; break; }
                    } else { field += line[i++]; }
                }
            } else {
                while (i < len && line[i] !== ';') { field += line[i++]; }
            }
            fields.push(field);
            field = '';
            if (line[i] === ';') i++;
        }
        return fields;
    }

    function processZip(file) {
        if (file.size > 500 * 1024) { showStatus(msgErrSize, true); return; }
        if (!window.JSZip) { showStatus(msgErr, true); return; }

        var csrf = (document.querySelector('input[name="csrf_token"]') || {}).value || '';

        window.acSpinner.progress(0, msgLoading);

        JSZip.loadAsync(file).then(function (zip) {
            window.acSpinner.progress(10, msgLoading);

            var target = null;
            zip.forEach(function (path, entry) {
                if (!entry.dir && /(?:^|\/)clear\/collection\.csv$/i.test(path)) {
                    target = entry;
                }
            });
            if (!target) { hideLoading(); showStatus(msgNoColl, true); return; }

            return target.async('string').then(function (text) {
                window.acSpinner.progress(20, msgLoading);

                var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
                var cards = {};
                var pastHeader = false;
                lines.forEach(function (line) {
                    line = line.trim();
                    if (!line) return;
                    // Locate the header row by its first column name, ignore everything before it
                    if (!pastHeader) {
                        var firstField = parseCSVLine(line)[0] || '';
                        if (firstField.trim().toLowerCase() === 'card_reference') { pastHeader = true; }
                        return;
                    }
                    var fields = parseCSVLine(line);
                    // CSV columns: card_reference;card_name;rarity;quantity
                    var ref = (fields[0] || '').trim().toUpperCase();
                    var qty = parseInt((fields[3] || '0').trim(), 10);
                    if (/^ALT_[A-Z0-9_]+$/.test(ref) && !/FOILER/.test(ref) && qty > 0) {
                        cards[ref] = Math.min(99, (cards[ref] || 0) + qty);
                    }
                });

                var refs = Object.keys(cards).sort();
                if (!refs.length) { hideLoading(); showStatus(msgNoColl, true); return; }

                // Build batches of 100 cards
                var batches = [];
                for (var i = 0; i < refs.length; i += 100) {
                    batches.push(refs.slice(i, i + 100).map(function (ref) {
                        return { cardReference: ref, quantity: cards[ref], isFoil: false };
                    }));
                }
                var totalBatches = batches.length;
                var collectionText = refs.map(function (ref) { return cards[ref] + ' ' + ref; }).join('\n');

                if (textarea) textarea.value = collectionText;
                if (window.collShowForm) window.collShowForm();

                // Step 1: clear existing entries (30 %)
                window.acSpinner.progress(30, msgLoading);
                return ajaxPost({ action: 'import_prepare', csrf_token: csrf }).then(function (r) {
                    if (!r || !r.ok) { hideLoading(); showStatus(msgErrPrepare, true); return; }

                    // Step 2: send batches (40 – 90 %)
                    var idx = 0;
                    function nextBatch() {
                        if (idx >= totalBatches) {
                            // Step 3: finalize (95 %)
                            window.acSpinner.progress(95, msgSave);
                            return ajaxPost({
                                action: 'import_finish',
                                csrf_token: csrf,
                                collection: collectionText
                            }).then(function (r) {
                                if (r && r.ok) {
                                    window.acSpinner.progress(100, msgSave);
                                    window.location.href = pageUrl;
                                } else {
                                    hideLoading(); showStatus(msgErr, true);
                                }
                            });
                        }
                        var pct = 40 + Math.round((idx / totalBatches) * 50);
                        window.acSpinner.progress(pct, msgLoading + ' ' + pct + '%');
                        return ajaxPost({
                            action: 'import_batch',
                            csrf_token: csrf,
                            cards: JSON.stringify(batches[idx])
                        }).then(function (r) {
                            if (!r || !r.ok) {
                                if (r && r.http) console.error('import_batch ' + (idx + 1) + '/' + totalBatches + ' HTTP ' + r.http, r.api_response);
                                hideLoading();
                                showStatus(msgErrBatch, true);
                                return;
                            }
                            idx++;
                            return nextBatch();
                        });
                    }
                    return nextBatch();
                });
            });
        }).catch(function () { hideLoading(); showStatus(msgErr, true); });
    }

    if (zipBtn) {
        zipBtn.addEventListener('click', function () {
            var file = zipInput && zipInput.files && zipInput.files[0];
            if (!file) { if (zipInput) zipInput.click(); return; }
            if (!confirm(msgConfirm)) return;
            processZip(file);
        });
    }
    if (zipInput) {
        zipInput.addEventListener('change', function () {
            if (zipStatus) zipStatus.style.display = 'none';
        });
    }
}());
</script>

