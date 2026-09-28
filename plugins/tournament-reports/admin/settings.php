<?php
// Admin page for tournament-reports settings.
// This file is included inside the admin layout.
require_once __DIR__ . '/../inc/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-settings');
    }

    $apiUrl = trim($_POST['api_url'] ?? '');
    trSaveApiUrl($apiUrl);
    $apiKey = trim($_POST['api_key'] ?? '');
    trSaveApiKey($apiKey);
    flash('Settings saved.');
    redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-settings');
}

$currentUrl  = trGetApiUrl();
$currentKey  = trGetApiKey();
$txt = [
    'en' => [
        'title'         => 'Tournament Settings',
        'api_label'     => 'GameApi base URL',
        'api_help'      => 'Base URL of GameApi. Reads (tournament list, standings) use the logged-in admin\'s own session — this key is not involved in them.',
        'api_ph'        => 'https://gameapi.example.com',
        'key_label'     => 'GameApi adjustment key',
        'key_help'      => 'GameApi\'s ApiKeys:Adjustment secret. Only used when correcting a player\'s recorded result — must match the value configured on GameApi\'s side.',
        'key_ph'        => 'Paste the adjustment API key here',
        'save_btn'      => 'Save settings',
    ],
    'fr' => [
        'title'         => 'Paramètres des tournois',
        'api_label'     => 'URL de base de GameApi',
        'api_help'      => 'URL de base de GameApi. Les lectures (liste des tournois, classements) utilisent la session de l\'administrateur connecté — cette clé n\'y intervient pas.',
        'api_ph'        => 'https://gameapi.example.com',
        'key_label'     => 'Clé de correction GameApi',
        'key_help'      => 'Le secret ApiKeys:Adjustment de GameApi. Utilisée uniquement pour corriger le résultat d\'un joueur — doit correspondre à la valeur configurée côté GameApi.',
        'key_ph'        => 'Collez la clé API de correction ici',
        'save_btn'      => 'Enregistrer',
    ],
][getUiLang()] ?? [];
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-trophy me-2"></i><?= h($txt['title']) ?></h1>
</div>

<div class="card-altered p-4">
    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="mb-4">
            <label class="form-label fw-semibold"><?= h($txt['api_label']) ?></label>
            <input type="url" name="api_url" class="form-control"
                   value="<?= h($currentUrl) ?>"
                   placeholder="<?= h($txt['api_ph']) ?>">
            <div class="form-text"><?= $txt['api_help'] ?></div>
        </div>

        <div class="mb-4">
            <label class="form-label fw-semibold"><?= h($txt['key_label']) ?></label>
            <input type="password" name="api_key" class="form-control" autocomplete="off"
                   value="<?= h($currentKey) ?>"
                   placeholder="<?= h($txt['key_ph']) ?>">
            <div class="form-text"><?= $txt['key_help'] ?></div>
        </div>

        <button type="submit" class="btn btn-primary-altered">
            <i class="fa-solid fa-check me-1"></i><?= h($txt['save_btn']) ?>
        </button>
    </form>
</div>
