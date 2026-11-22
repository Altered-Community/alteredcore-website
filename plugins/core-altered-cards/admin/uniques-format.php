<?php
// Admin: which uniques search API format id the site sends as `format=<id>` to
// restrict Unique cards to the Frontier allowlist (card search "Frontier" filter,
// deckbuilder Frontier check, card detail pages). Each Frontier season is
// published as its own entry in the formats manifest, so switching season is a
// setting change here rather than a code deploy.
require_once dirname(__DIR__) . '/includes/functions.php';

$lang = getUiLang();

$txt = [
    'en' => [
        'title'            => 'Uniques format',
        'section'          => 'Frontier format id',
        'help'             => 'Format id sent to the uniques search API (format=<id>) to restrict Unique cards to the Frontier allowlist: card search "Frontier" filter, deckbuilder Frontier check and card pages.',
        'current'          => 'Current value:',
        'default_badge'    => 'default',
        'label_select'     => 'Format from the manifest',
        'label_text'       => 'Format id',
        'not_in_manifest'  => 'not in manifest',
        'manifest_source'  => 'Formats manifest:',
        'manifest_failed'  => 'The formats manifest could not be fetched. Enter the format id manually.',
        'text_help'        => 'Letters, digits, ".", "_" and "-" only (32 characters max).',
        'btn_save'         => 'Save',
        'flash_saved'      => 'Frontier format id set to "%s".',
        'err_token'        => 'Invalid form token.',
        'err_perm'         => 'You do not have permission to edit this setting.',
        'err_invalid'      => 'Invalid format id — use letters, digits, ".", "_" or "-" (32 characters max).',
    ],
    'fr' => [
        'title'            => 'Format des Uniques',
        'section'          => 'Identifiant du format Frontier',
        'help'             => 'Identifiant de format envoyé à l\'API de recherche des Uniques (format=<id>) pour restreindre les cartes Uniques à la liste autorisée Frontier : filtre « Frontier » de la recherche, vérification Frontier du créateur de deck et pages carte.',
        'current'          => 'Valeur actuelle :',
        'default_badge'    => 'par défaut',
        'label_select'     => 'Format du manifeste',
        'label_text'       => 'Identifiant du format',
        'not_in_manifest'  => 'absent du manifeste',
        'manifest_source'  => 'Manifeste des formats :',
        'manifest_failed'  => 'Le manifeste des formats n\'a pas pu être récupéré. Saisissez l\'identifiant du format manuellement.',
        'text_help'        => 'Lettres, chiffres, « . », « _ » et « - » uniquement (32 caractères max).',
        'btn_save'         => 'Enregistrer',
        'flash_saved'      => 'Identifiant du format Frontier défini sur « %s ».',
        'err_token'        => 'Jeton de formulaire invalide.',
        'err_perm'         => 'Vous n\'avez pas la permission de modifier ce paramètre.',
        'err_invalid'      => 'Identifiant invalide — lettres, chiffres, « . », « _ » ou « - » uniquement (32 caractères max).',
    ],
];
$txt = $txt[$lang] ?? $txt['en'];

$settingKey = 'uniques_frontier_format';
$selfUrl    = BASE_URL . '/admin/plugin-page?plugin=core-altered-cards&section=uniques-format';
$errors     = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = $txt['err_token'];
    } elseif (!adminCanEdit()) {
        $errors[] = $txt['err_perm'];
    } else {
        $value = trim($_POST['format_id'] ?? '');
        if (!cacIsValidUniquesFormatId($value)) {
            $errors[] = $txt['err_invalid'];
        } else {
            saveSetting($settingKey, $value);
            flash(sprintf($txt['flash_saved'], $value));
            redirect($selfUrl);
        }
    }
}

$current     = cacUniquesFrontierFormat();
$isDefault   = getSetting($settingKey, '') === '';
$manifestUrl = cacFormatsManifestUrl();
$manifest    = cacFetchFormatsManifest();
$inManifest  = $manifest !== null && in_array($current, array_column($manifest, 'id'), true);
?>

<div class="admin-header-bar">
    <h1><?= ac_icon('map', 'me-2') ?><?= h($txt['title']) ?></h1>
</div>

<?php if ($errors): ?>
<div class="alert alert-danger">
    <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<div class="ac-card mb-4" style="max-width:560px">
    <h5 class="mb-2"><?= ac_icon('settings', 'me-2') ?><?= h($txt['section']) ?></h5>
    <p class="text-muted small"><?= h($txt['help']) ?></p>

    <p class="mb-3">
        <span class="fw-semibold"><?= h($txt['current']) ?></span>
        <code><?= h($current) ?></code>
        <?php if ($isDefault): ?><span class="badge bg-secondary ms-1"><?= h($txt['default_badge']) ?></span><?php endif; ?>
    </p>

    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="mb-3">
            <?php if ($manifest !== null): ?>
            <label class="form-label fw-semibold" for="uf-format-id"><?= h($txt['label_select']) ?></label>
            <select name="format_id" id="uf-format-id" class="form-select">
                <?php if (!$inManifest): ?>
                <option value="<?= h($current) ?>" selected><?= h($current) ?> (<?= h($txt['not_in_manifest']) ?>)</option>
                <?php endif; ?>
                <?php foreach ($manifest as $entry): ?>
                <option value="<?= h($entry['id']) ?>"<?= $entry['id'] === $current ? ' selected' : '' ?>>
                    <?= h($entry['name']) ?> (<?= h($entry['id']) ?><?= $entry['version'] !== null ? ', v' . h((string) $entry['version']) : '' ?>)
                </option>
                <?php endforeach; ?>
            </select>
            <div class="form-text"><?= h($txt['manifest_source']) ?> <code><?= h($manifestUrl) ?></code></div>
            <?php else: ?>
            <div class="alert alert-warning small"><?= h($txt['manifest_failed']) ?><br><code><?= h($manifestUrl) ?></code></div>
            <label class="form-label fw-semibold" for="uf-format-id"><?= h($txt['label_text']) ?></label>
            <input type="text"
                   name="format_id"
                   id="uf-format-id"
                   class="form-control font-monospace"
                   value="<?= h($current) ?>"
                   maxlength="32"
                   pattern="[A-Za-z0-9_.\-]{1,32}"
                   required
                   autocomplete="off">
            <div class="form-text"><?= h($txt['text_help']) ?></div>
            <?php endif; ?>
        </div>

        <button type="submit" class="ac-button ac-button--sm">
            <?= ac_icon('save', 'me-1') ?>
            <?= h($txt['btn_save']) ?>
        </button>
    </form>
</div>
