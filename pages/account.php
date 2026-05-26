<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// translations
$txt = [
    'en' => [
        'account_title'            => 'My Account',
        'account_type'             => 'Account type',
        'account_type_kc'          => 'Altered.re account',
        'account_type_local_admin' => 'Local admin',
        'account_type_local_user'  => 'Local account',
        'account_edit_profile'     => 'Edit my profile',
        'account_edit_profile_note'=> 'Change your username, email or password.',
        'account_member_since'     => 'Member since',
        'account_kc_sub'           => 'Keycloak ID',
        'account_preferences'      => 'Preferences',
        'account_lang_pref'        => 'Language',
        'account_lang_auto'        => 'Auto (browser)',
        'account_save'             => 'Save',
        'account_saved'            => 'Preferences saved.',
        'account_delete_btn'       => 'Delete my account',
        'account_delete_title'     => 'Delete account',
        'account_delete_confirm'   => 'This will permanently delete your account on this site. This action cannot be undone.',
        'account_delete_note'      => 'Your Altered account (altered.gg) will not be affected.',
        'account_delete_cancel'    => 'Cancel',
        'account_delete_confirm_btn' => 'Yes, delete my account',
        'error_invalid_token'      => 'Invalid form token.',
    ],
    'fr' => [
        'account_title'            => 'Mon compte',
        'account_type'             => 'Type de compte',
        'account_type_kc'          => 'Compte Altered.re',
        'account_type_local_admin' => 'Admin local',
        'account_type_local_user'  => 'Compte local',
        'account_edit_profile'     => 'Modifier mon profil',
        'account_edit_profile_note'=> 'Changer votre pseudo, email ou mot de passe.',
        'account_member_since'     => 'Membre depuis',
        'account_kc_sub'           => 'Identifiant Keycloak',
        'account_preferences'      => 'Préférences',
        'account_lang_pref'        => 'Langue',
        'account_lang_auto'        => 'Auto (navigateur)',
        'account_save'             => 'Enregistrer',
        'account_saved'            => 'Préférences enregistrées.',
        'account_delete_btn'       => 'Supprimer mon compte',
        'account_delete_title'     => 'Supprimer le compte',
        'account_delete_confirm'   => 'Cela supprimera définitivement votre compte sur ce site. Cette action est irréversible.',
        'account_delete_note'      => 'Votre compte Altered (altered.gg) ne sera pas affecté.',
        'account_delete_cancel'    => 'Annuler',
        'account_delete_confirm_btn' => 'Oui, supprimer mon compte',
        'error_invalid_token'      => 'Jeton de formulaire invalide.',
    ],
][getUiLang()] ?? [];

if (!kcIsLoggedIn()) {
    redirect(BASE_URL . '/pages/login');
}

$kcU    = kcUser();
$db     = getDB();
$userId = (int)($_SESSION['user_id'] ?? 0);

$saved  = false;
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = $txt['error_invalid_token'];
    } elseif (($_POST['action'] ?? '') === 'delete_account') {
        if ($userId) {
            $db->prepare(q("DELETE FROM {users} WHERE id = :id AND (kc_sub IS NOT NULL OR local_password_hash IS NOT NULL)"))
               ->execute([':id' => $userId]);
        }
        // Clear all session data and redirect to homepage
        session_destroy();
        redirect(BASE_URL . '/');
    } else {
        $langPref = in_array($_POST['lang_pref'] ?? '', ['en', 'fr', 'es', 'it', 'de'], true) ? $_POST['lang_pref'] : null;
        if ($userId) {
            $db->prepare(q("UPDATE {users} SET lang_pref = :l WHERE id = :id"))
               ->execute([':l' => $langPref, ':id' => $userId]);
        }
        $_SESSION['lang'] = $langPref ?: (strpos($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '', 'fr') !== false ? 'fr' : DEFAULT_LANG);
        $saved = true;
    }
}

// Load full user row for display
$userRow = null;
if ($userId) {
    $stmt = $db->prepare(q("SELECT username, email, lang_pref, kc_sub, admin_username, created_at FROM {users} WHERE id = :id"));
    $stmt->execute([':id' => $userId]);
    $userRow = $stmt->fetch();
}

$pageTitle = $txt['account_title'];
include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4" style="max-width:640px">

    <div class="section-title mb-4"><span><?= $txt['account_title'] ?></span></div>

    <?php if ($saved): ?>
        <div class="alert alert-success"><?= $txt['account_saved'] ?></div>
    <?php endif; ?>
    <?php if ($errors): ?>
        <div class="alert alert-danger"><?php foreach ($errors as $e) echo h($e); ?></div>
    <?php endif; ?>

    <!-- Profile info -->
    <div class="card-altered p-4 mb-4">
        <div class="mb-3 pb-3 d-flex align-items-center gap-3" style="border-bottom:1px solid var(--sand-300)">
            <div style="font-size:2.5rem;flex-shrink:0;line-height:1">
                <i class="fa-solid fa-circle-user" style="color:var(--primary-500)"></i>
            </div>
            <div>
                <div style="font-weight:800;font-size:1.25rem"><?= h($userRow['username'] ?? $kcU['username']) ?></div>
                <div style="font-size:.85rem;color:var(--neutral-500)"><?= h($userRow['email'] ?? $kcU['email']) ?></div>
            </div>
        </div>
        <dl class="row mb-0" style="font-size:.9rem">
            <dt class="col-sm-5 text-muted"><?= $txt['account_type'] ?></dt>
            <dd class="col-sm-7">
                <?php if (!empty($userRow['kc_sub'])): ?>
                    <i class="fa-solid fa-key me-1" style="color:var(--primary-500)"></i> <?= $txt['account_type_kc'] ?>
                <?php elseif (!empty($userRow['admin_username'])): ?>
                    <i class="fa-solid fa-shield-halved me-1"></i> <?= $txt['account_type_local_admin'] ?>
                <?php else: ?>
                    <i class="fa-solid fa-user me-1"></i> <?= $txt['account_type_local_user'] ?>
                <?php endif; ?>
            </dd>
            <dt class="col-sm-5 text-muted"><?= $txt['account_member_since'] ?></dt>
            <dd class="col-sm-7"><?= $userRow ? date('d/m/Y', strtotime($userRow['created_at'])) : '—' ?></dd>
            <?php if (isset($_GET['plus']) && !empty($userRow['kc_sub'])): ?>
            <dt class="col-sm-5 text-muted"><?= $txt['account_kc_sub'] ?></dt>
            <dd class="col-sm-7" style="font-family:monospace;font-size:.82rem;word-break:break-all"><?= h($userRow['kc_sub']) ?></dd>
            <?php endif; ?>
        </dl>
        <?php if (!empty($userRow['kc_sub']) && defined('KC_URL') && KC_URL !== ''): ?>
        <div class="mt-3 pt-3" style="border-top:1px solid var(--sand-300)">
            <a href="<?= KC_URL ?>/realms/<?= KC_REALM ?>/account/"
               target="_blank" rel="noopener"
               class="btn btn-outline-secondary btn-sm">
                <i class="fa-solid fa-pen-to-square me-1"></i> <?= $txt['account_edit_profile'] ?>
            </a>
            <div class="mt-1" style="font-size:.8rem;color:var(--neutral-500)">
                <?= $txt['account_edit_profile_note'] ?>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Preferences -->
    <div class="card-altered p-4 mb-4">
        <h6 class="fw-bold mb-3"><?= $txt['account_preferences'] ?></h6>
        <form method="post" novalidate>
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <div class="mb-4">
                <label class="form-label"><?= $txt['account_lang_pref'] ?></label>
                <select name="lang_pref" class="form-select" style="max-width:220px">
                    <option value="" <?= ($userRow['lang_pref'] ?? '') === '' ? 'selected' : '' ?>>
                        <?= $txt['account_lang_auto'] ?>
                    </option>
                    <option value="en" <?= ($userRow['lang_pref'] ?? '') === 'en' ? 'selected' : '' ?>>
                        🇬🇧 English
                    </option>
                    <option value="fr" <?= ($userRow['lang_pref'] ?? '') === 'fr' ? 'selected' : '' ?>>
                        🇫🇷 Français
                    </option>
                    <option value="es" <?= ($userRow['lang_pref'] ?? '') === 'es' ? 'selected' : '' ?>>
                        🇪🇸 Español
                    </option>
                    <option value="it" <?= ($userRow['lang_pref'] ?? '') === 'it' ? 'selected' : '' ?>>
                        🇮🇹 Italiano
                    </option>
                    <option value="de" <?= ($userRow['lang_pref'] ?? '') === 'de' ? 'selected' : '' ?>>
                        🇩🇪 Deutsch
                    </option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i> <?= $txt['account_save'] ?>
            </button>
        </form>
    </div>

    <!-- Delete account -->
    <div class="card-altered p-4" style="border-color:var(--sand-300)">
        <h6 class="fw-bold mb-1" style="color:var(--neutral-700)"><?= $txt['account_delete_title'] ?></h6>
        <p class="small mb-3" style="color:var(--neutral-500)"><?= $txt['account_delete_confirm'] ?></p>
        <button type="button" class="btn btn-outline-danger btn-sm" data-bs-toggle="modal" data-bs-target="#deleteAccountModal">
            <i class="fa-solid fa-trash me-1"></i> <?= $txt['account_delete_btn'] ?>
        </button>
    </div>

</div>

<!-- Confirmation modal -->
<div class="modal fade" id="deleteAccountModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:440px">
        <div class="modal-content" style="border-radius:1rem;border:none">
            <div class="modal-body p-4 text-center" style="background:var(--sand-100)">
                <div style="font-size:2.5rem;margin-bottom:.75rem">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#f87171"></i>
                </div>
                <h5 style="font-weight:800;color:var(--neutral-800)"><?= $txt['account_delete_title'] ?></h5>
                <p style="color:var(--neutral-600);font-size:.9rem;margin:.75rem 0 .5rem">
                    <?= $txt['account_delete_confirm'] ?>
                </p>
                <?php if (!empty($userRow['kc_sub'])): ?>
                <p class="small" style="color:var(--neutral-400)">
                    <i class="fa-solid fa-circle-info me-1"></i><?= $txt['account_delete_note'] ?>
                </p>
                <?php endif; ?>
                <div class="d-flex gap-2 mt-4">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="modal">
                        <?= $txt['account_delete_cancel'] ?>
                    </button>
                    <form method="post" class="flex-fill">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="delete_account">
                        <button type="submit" class="btn btn-danger w-100">
                            <?= $txt['account_delete_confirm_btn'] ?>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
