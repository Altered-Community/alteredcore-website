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
    flash('Settings saved.');
    redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-settings');
}

$currentUrl = trGetApiUrl();
$txt = [
    'en' => [
        'title'      => 'Tournament Settings',
        'api_label'  => 'External Tournament API URL',
        'api_help'   => 'Base URL of the external tournament results API. The plugin will call {URL}/tournaments/{id} to fetch tournament data.',
        'api_ph'     => 'https://api.example.com/tournaments',
        'save_btn'   => 'Save settings',
    ],
    'fr' => [
        'title'      => 'Paramètres des tournois',
        'api_label'  => 'URL de l\'API externe de tournois',
        'api_help'   => 'URL de base de l\'API de résultats de tournoi. Le plugin appellera {URL}/tournaments/{id} pour récupérer les données.',
        'api_ph'     => 'https://api.example.com/tournaments',
        'save_btn'   => 'Enregistrer',
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

        <button type="submit" class="btn btn-primary-altered">
            <i class="fa-solid fa-check me-1"></i><?= h($txt['save_btn']) ?>
        </button>
    </form>
</div>
