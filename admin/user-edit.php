<?php
$adminPageTitle = 'Edit user';
$adminSection   = 'users';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$id  = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Load groups for selector
try {
    $allGroups = $db->query(q("SELECT id, name, color FROM {user_groups} ORDER BY name ASC"))->fetchAll();
} catch (\PDOException $e) {
    $allGroups = [];
}

// Default row for new admin creation
$row = ['id' => 0, 'kc_sub' => null, 'email' => '', 'username' => '',
        'is_admin' => 1, 'admin_username' => '', 'lang_pref' => '', 'group_id' => null];
$isNewAdmin = true;

if ($id) {
    $stmt = $db->prepare(q("SELECT id, kc_sub, email, username, is_admin, admin_username, lang_pref, group_id FROM {users} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $found = $stmt->fetch();
    if ($found) {
        $row        = $found;
        $isNewAdmin = false;
    } else {
        flash('User not found.', 'error');
        redirect(BASE_URL . '/admin/users');
    }
}

// Email/username fields are read-only for KC users when STORE_KC_USER_DATA is off
$kcDataLocked = !STORE_KC_USER_DATA && !$isNewAdmin && !empty($row['kc_sub']);

// Admin login credentials: visible only to the local admin, and only for new admins or users with existing admin credentials
$showAdminCreds = !empty($_SESSION['admin_logged_in']) && ($isNewAdmin || !empty($row['admin_username']));

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $username      = trim($_POST['username']       ?? '');
        $email         = trim($_POST['email']          ?? '');
        $langPref      = in_array($_POST['lang_pref'] ?? '', ['en','fr','es','it','de',''], true) ? ($_POST['lang_pref'] ?? '') : '';
        $isAdmin       = isset($_POST['is_admin']) ? 1 : 0;
        $adminUsername = trim($_POST['admin_username'] ?? '');
        $password      = $_POST['password']  ?? '';
        $confirm       = $_POST['confirm']   ?? '';
        $groupId       = ($_POST['group_id'] ?? '') !== '' ? (int)$_POST['group_id'] : null;

        if (!$kcDataLocked && $username === '') $errors[] = 'Username is required.';
        if (!$kcDataLocked && $email    === '') $errors[] = 'Email is required.';

        // Admin credentials section — only validated when visible
        $hasAdminLogin = $showAdminCreds && ($adminUsername !== '' || (!$isNewAdmin && $row['admin_username']));
        if ($showAdminCreds) {
            if ($adminUsername !== '' && strlen($adminUsername) < 3) {
                $errors[] = 'Admin login must be at least 3 characters.';
            }
            if ($isNewAdmin) {
                if ($adminUsername === '') $errors[] = 'Admin login is required for new accounts.';
                if (strlen($password) < 8) $errors[] = 'Password must be at least 8 characters.';
                if ($password !== $confirm) $errors[] = 'Passwords do not match.';
            } elseif ($password !== '') {
                if (strlen($password) < 8) $errors[] = 'Password must be at least 8 characters.';
                if ($password !== $confirm) $errors[] = 'Passwords do not match.';
            }
        }

        if (empty($errors)) {
            if ($isNewAdmin) {
                $hash = password_hash($password, PASSWORD_BCRYPT);
                try {
                    $db->prepare(q(
                        "INSERT INTO {users} (kc_sub, email, username, is_admin, admin_username, admin_password_hash, lang_pref, group_id)
                         VALUES (NULL, :email, :uname, 1, :admin_u, :hash, :lang, :gid)"
                    ))->execute([
                        ':email'   => $email ?: ($adminUsername . '@local'),
                        ':uname'   => $username ?: $adminUsername,
                        ':admin_u' => $adminUsername,
                        ':hash'    => $hash,
                        ':lang'    => $langPref ?: null,
                        ':gid'     => $groupId,
                    ]);
                    flash('Admin account created.');
                } catch (PDOException $e) {
                    $errors[] = 'That username or email is already taken.';
                }
            } else {
                // Build update
                $params = [
                    ':lang_pref' => $langPref ?: null,
                    ':is_admin'  => $isAdmin,
                    ':group_id'  => $groupId,
                    ':id'        => $id,
                ];
                $profileSql = '';
                if (!$kcDataLocked) {
                    $params[':username'] = $username;
                    $params[':email']    = $email;
                    $profileSql = 'username=:username, email=:email,';
                }

                // Admin login: update only when visible to current SA
                $adminLoginSql = '';
                $passwordSql   = '';
                if ($showAdminCreds) {
                    if ($adminUsername !== '') {
                        $params[':admin_u'] = $adminUsername;
                        $adminLoginSql = ', admin_username = :admin_u';
                    } elseif ($row['admin_username'] !== '' && $row['admin_username'] !== null) {
                        // Field was cleared — remove admin login
                        $params[':admin_u'] = null;
                        $adminLoginSql = ', admin_username = :admin_u';
                    }
                    if ($password !== '') {
                        $params[':hash'] = password_hash($password, PASSWORD_BCRYPT);
                        $passwordSql = ', admin_password_hash = :hash';
                    }
                }

                try {
                    $db->prepare(q(
                        "UPDATE {users} SET $profileSql lang_pref=:lang_pref,
                         is_admin=:is_admin, group_id=:group_id $adminLoginSql $passwordSql WHERE id=:id"
                    ))->execute($params);
                    flash('User updated.');
                } catch (PDOException $e) {
                    $errors[] = 'That username or email is already taken.';
                }
            }

            if (empty($errors)) {
                redirect(BASE_URL . '/admin/users');
            }
        }

        // Re-fill form on error
        $refill = [
            'lang_pref'      => $langPref,
            'is_admin'       => $isAdmin,
            'admin_username' => $adminUsername,
            'group_id'       => $groupId,
        ];
        if (!$kcDataLocked) {
            $refill['username'] = $username;
            $refill['email']    = $email;
        }
        $row = array_merge($row, $refill);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-user-pen me-2"></i><?= $isNewAdmin ? 'Create admin account' : 'Edit user — ' . h($row['username'] ?: ($row['kc_sub'] ? 'KC:' . substr($row['kc_sub'], 0, 8) . '…' : '#' . $row['id'])) ?></h1>
    <a href="<?= BASE_URL ?>/admin/users" class="btn btn-outline-secondary btn-sm">← Back</a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="row g-4" style="max-width:800px">

        <!-- Profile -->
        <div class="col-md-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">Profile</h6>
                <div class="mb-3">
                    <label class="form-label">
                        Username <?= $kcDataLocked ? '' : '<span class="text-danger">*</span>' ?>
                    </label>
                    <input type="text" name="username" class="form-control"
                           value="<?= h($row['username'] ?? '') ?>" autocomplete="off"
                           <?= $kcDataLocked ? 'disabled title="Managed by Keycloak"' : '' ?>>
                </div>
                <div class="mb-3">
                    <label class="form-label">
                        Email <?= $kcDataLocked ? '' : '<span class="text-danger">*</span>' ?>
                    </label>
                    <input type="email" name="email" class="form-control"
                           value="<?= h($row['email'] ?? '') ?>" autocomplete="off"
                           <?= $kcDataLocked ? 'disabled title="Managed by Keycloak"' : '' ?>>
                </div>
                <?php if ($kcDataLocked): ?>
                    <p class="text-muted small mb-3">
                        <i class="fa-solid fa-lock me-1"></i>
                        Username and email are managed by Keycloak and not stored locally.
                    </p>
                <?php endif; ?>
                <div class="mb-3">
                    <label class="form-label">Language preference</label>
                    <select name="lang_pref" class="form-select">
                        <option value="" <?= ($row['lang_pref'] ?? '') === '' ? 'selected' : '' ?>>Auto (browser)</option>
                        <option value="en" <?= ($row['lang_pref'] ?? '') === 'en' ? 'selected' : '' ?>>🇬🇧 English</option>
                        <option value="fr" <?= ($row['lang_pref'] ?? '') === 'fr' ? 'selected' : '' ?>>🇫🇷 French</option>
                        <option value="es" <?= ($row['lang_pref'] ?? '') === 'es' ? 'selected' : '' ?>>🇪🇸 Español</option>
                        <option value="it" <?= ($row['lang_pref'] ?? '') === 'it' ? 'selected' : '' ?>>🇮🇹 Italiano</option>
                        <option value="de" <?= ($row['lang_pref'] ?? '') === 'de' ? 'selected' : '' ?>>🇩🇪 Deutsch</option>
                    </select>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="is_admin" id="is_admin"
                           value="1" <?= $row['is_admin'] ? 'checked' : '' ?>
                           <?= ($id && $id === (int)($_SESSION['admin_id'] ?? 0)) ? 'disabled' : '' ?>>
                    <label class="form-check-label" for="is_admin">Admin</label>
                    <?php if ($id && $id === (int)($_SESSION['admin_id'] ?? 0)): ?>
                        <input type="hidden" name="is_admin" value="1">
                        <div class="form-text">You cannot remove your own admin status.</div>
                    <?php endif; ?>
                </div>
                <div class="mt-3">
                    <label class="form-label">Group</label>
                    <select name="group_id" class="form-select">
                        <option value="">— none —</option>
                        <?php foreach ($allGroups as $grp): ?>
                        <option value="<?= $grp['id'] ?>"
                            <?= (int)($row['group_id'] ?? 0) === (int)$grp['id'] ? 'selected' : '' ?>>
                            <?= h($grp['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php if ($row['kc_sub']): ?>
                    <div class="mt-3 p-2 rounded" style="background:var(--sand-200);font-size:.8rem">
                        <i class="fa-solid fa-key me-1 text-muted"></i>
                        <span class="text-muted">Keycloak sub:</span> <code><?= h($row['kc_sub']) ?></code>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Admin login — superadmin only, for superadmin users -->
        <?php if ($showAdminCreds): ?>
        <div class="col-md-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">Admin login credentials</h6>
                <p class="text-muted small mb-3">
                    Leave blank to keep existing credentials. Clear the login field to remove admin login access.
                </p>
                <div class="mb-3">
                    <label class="form-label">
                        Admin login <?= $isNewAdmin ? '<span class="text-danger">*</span>' : '' ?>
                    </label>
                    <input type="text" name="admin_username" class="form-control"
                           value="<?= h($row['admin_username'] ?? '') ?>"
                           autocomplete="off"
                           placeholder="<?= $isNewAdmin ? '' : 'Leave blank to keep current' ?>">
                </div>
                <div class="mb-3">
                    <label class="form-label">
                        Password
                        <?= $isNewAdmin
                            ? '<span class="text-danger">*</span>'
                            : '<small class="text-muted">(leave blank to keep current)</small>' ?>
                    </label>
                    <input type="password" name="password" class="form-control" autocomplete="new-password">
                </div>
                <div class="mb-3">
                    <label class="form-label">Confirm password</label>
                    <input type="password" name="confirm" class="form-control" autocomplete="new-password">
                </div>
            </div>
        </div>
        <?php endif; ?>

    </div>

    <div class="mt-4 d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/users" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
