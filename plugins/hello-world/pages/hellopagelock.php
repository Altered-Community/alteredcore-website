<?php
// Protected page — redirect to login if not authenticated.
loginRequired();

// kcUser() works in both SSO and local account modes.
// $user['sub'] is empty in local account mode (no SSO UUID available).
$user     = kcUser();
$userId   = (int)($_SESSION['user_id'] ?? 0);
$userName = $user['username'];
$userMail = $user['email'];
$userSub  = $user['sub'];

// translations
$txt = [
    'en' => [
        'page_title'  => 'About Hello World',
        'description' => 'This is the Hello World example plugin — it demonstrates multiple pages, multiple admin sections and multiple database tables.',
        'user_info'   => 'User information',
        'id_label'    => 'Local ID',
        'id_note'     => 'DB primary key — use for internal joins',
        'sub_label'   => 'SSO sub',
        'sub_note'    => 'Stable unique UUID — use for external APIs (empty in local account mode)',
        'user_label'  => 'Username',
        'user_note'   => 'Display name / preferred username',
        'mail_label'  => 'Email',
        'mail_note'   => 'Address from the active session',
    ],
    'fr' => [
        'page_title'  => 'À propos',
        'description' => 'Ceci est le plugin d\'exemple Hello World — il illustre plusieurs pages, plusieurs sections d\'administration et plusieurs tables de base de données.',
        'user_info'   => 'Informations utilisateur',
        'id_label'    => 'ID local',
        'id_note'     => 'Clé primaire DB — à utiliser pour les jointures internes',
        'sub_label'   => 'SSO sub',
        'sub_note'    => 'UUID stable unique — pour les API externes (vide en mode local)',
        'user_label'  => 'Nom d\'utilisateur',
        'user_note'   => 'Nom d\'affichage / nom d\'utilisateur préféré',
        'mail_label'  => 'Email',
        'mail_note'   => 'Adresse depuis la session active',
    ],
][getUiLang()] ?? [];

$pageTitle = $txt['page_title'];
$greeting  = $db->query(qp("SELECT value FROM {settings} WHERE `key` = 'greeting'"))->fetchColumn();
?>
<div class="container py-4">

    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
    </div>

    

    <div class="card-altered p-4 mb-3">
        <p><?= h($greeting ?: 'Hello!') ?></p>
        <p class="text-muted small mb-0"><?= h($txt['description']) ?></p>
    </div>

    <!-- User identity — what is available after login -->
    <div class="card-altered p-4">
        <h2 class="h6 fw-semibold mb-3">
            <i class="fa-solid fa-user me-1"></i>
            <?= h($txt['user_info']) ?>
        </h2>
        <table class="table table-sm mb-0">
            <tbody>
                <tr>
                    <td class="text-muted" style="width:160px"><?= h($txt['id_label']) ?></td>
                    <td><code><?= h((string)$userId) ?></code></td>
                    <td class="text-muted small"><?= h($txt['id_note']) ?></td>
                </tr>
                <tr>
                    <td class="text-muted"><?= h($txt['sub_label']) ?></td>
                    <td><code><?= h($userSub) ?></code></td>
                    <td class="text-muted small"><?= h($txt['sub_note']) ?></td>
                </tr>
                <tr>
                    <td class="text-muted"><?= h($txt['user_label']) ?></td>
                    <td><code><?= h($userName) ?></code></td>
                    <td class="text-muted small"><?= h($txt['user_note']) ?></td>
                </tr>
                <tr>
                    <td class="text-muted"><?= h($txt['mail_label']) ?></td>
                    <td><code><?= h($userMail) ?></code></td>
                    <td class="text-muted small"><?= h($txt['mail_note']) ?></td>
                </tr>
            </tbody>
        </table>
    </div>

</div>
