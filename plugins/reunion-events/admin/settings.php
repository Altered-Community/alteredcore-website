<?php
require_once __DIR__ . '/../inc/functions.php';

$lang = getUiLang();

$txt = [
    'en' => [
        'title'           => 'Events — Settings',
        'api_section'     => 'API Configuration',
        'label_api_key'   => 'API Key',
        'placeholder'     => 'att_xxxxxxxxxxxxxxxxxxxxxxxx',
        'help_api_key'    => 'Enter your Altered Tournament Tools API key. You can get one from your profile on altered-tournament-tools.com.',
        'btn_save'        => 'Save',
        'btn_test'        => 'Test Connection',
        'flash_saved'     => 'Settings saved.',
        'test_success'    => 'API connection successful!',
        'test_failed'     => 'API connection failed. Please check your API key.',
        'test_no_key'     => 'Please enter an API key first.',
    ],
    'fr' => [
        'title'           => 'Événements — Paramètres',
        'api_section'     => 'Configuration API',
        'label_api_key'   => 'Clé API',
        'placeholder'     => 'att_xxxxxxxxxxxxxxxxxxxxxxxx',
        'help_api_key'    => 'Entrez votre clé API Altered Tournament Tools. Vous pouvez en obtenir une depuis votre profil sur altered-tournament-tools.com.',
        'btn_save'        => 'Enregistrer',
        'btn_test'        => 'Tester la connexion',
        'flash_saved'     => 'Paramètres enregistrés.',
        'test_success'    => 'Connexion API réussie !',
        'test_failed'     => 'Connexion API échouée. Veuillez vérifier votre clé API.',
        'test_no_key'     => 'Veuillez d\'abord entrer une clé API.',
    ],
][$lang] ?? [];

// POST handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/plugin-page?plugin=reunion-events&section=events-settings');
    }

    $action = $_POST['action'] ?? 'save';

    if ($action === 'save') {
        $apiKey = trim($_POST['api_key'] ?? '');
        reSaveSetting('api_key', $apiKey);
        flash($txt['flash_saved']);
    } elseif ($action === 'test') {
        $apiKey = trim($_POST['api_key'] ?? '');
        if (empty($apiKey)) {
            flash($txt['test_no_key'], 'warning');
        } else {
            // Temporarily save for testing
            reSaveSetting('api_key', $apiKey);

            // Test the connection
            $test = reApiRequest('tournaments/upcoming', ['limit' => 1]);
            if ($test !== null) {
                flash($txt['test_success'], 'success');
            } else {
                flash($txt['test_failed'], 'error');
            }
        }
    }

    redirect(BASE_URL . '/admin/plugin-page?plugin=reunion-events&section=events-settings');
}

// Current values
$apiKey = reGetSetting('api_key', '');
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-gear me-2"></i><?= h($txt['title']) ?></h1>
</div>

<div class="card-altered p-4" style="max-width:560px">
    <h5 class="mb-3">
        <i class="fa-solid fa-plug me-2"></i>
        <?= h($txt['api_section']) ?>
    </h5>

    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="mb-3">
            <label class="form-label fw-semibold"><?= h($txt['label_api_key']) ?></label>
            <input type="text"
                   name="api_key"
                   class="form-control font-monospace"
                   value="<?= h($apiKey) ?>"
                   placeholder="<?= h($txt['placeholder']) ?>"
                   autocomplete="off">
            <div class="form-text"><?= h($txt['help_api_key']) ?></div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" name="action" value="save" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i>
                <?= h($txt['btn_save']) ?>
            </button>
            <button type="submit" name="action" value="test" class="btn btn-sm btn-outline-secondary">
                <i class="fa-solid fa-plug-circle-check me-1"></i>
                <?= h($txt['btn_test']) ?>
            </button>
        </div>
    </form>
</div>
