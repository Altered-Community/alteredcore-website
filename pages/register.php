<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// Only available in local auth mode
if (defined('KC_URL') && KC_URL !== '') {
    redirect(BASE_URL . '/pages/login');
}

if (kcIsLoggedIn()) {
    redirect(BASE_URL . '/');
}

$txt = [
    'en' => [
        'register_title'    => 'Create account',
        'register_subtitle' => 'Join the community.',
        'username'          => 'Username',
        'email'             => 'Email address',
        'password'          => 'Password',
        'password_confirm'  => 'Confirm password',
        'register_btn'      => 'Create account',
        'login_link'        => 'Already have an account? Sign in.',
        'disabled'          => 'Registration is currently disabled. Please contact the administrator.',
    ],
    'fr' => [
        'register_title'    => 'Créer un compte',
        'register_subtitle' => 'Rejoignez la communauté.',
        'username'          => 'Pseudo',
        'email'             => 'Adresse e-mail',
        'password'          => 'Mot de passe',
        'password_confirm'  => 'Confirmer le mot de passe',
        'register_btn'      => 'Créer mon compte',
        'login_link'        => 'Déjà inscrit ? Connectez-vous.',
        'disabled'          => "Les inscriptions sont désactivées. Contactez l'administrateur.",
    ],
][getUiLang()] ?? [];

$registerEnabled = !defined('LOCAL_ALLOW_REGISTER') || LOCAL_ALLOW_REGISTER;

$errors = $_SESSION['register_errors'] ?? [];
$old    = $_SESSION['register_old']    ?? [];
unset($_SESSION['register_errors'], $_SESSION['register_old']);

$pageTitle = $txt['register_title'];
include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4" style="max-width:520px">
    <div class="text-center mb-5">
        <h1 class="section-title"><span><?= $txt['register_title'] ?></span></h1>
        <p style="color:var(--neutral-500)"><?= $txt['register_subtitle'] ?></p>
    </div>

    <?php if (!$registerEnabled): ?>
        <div class="alert alert-warning"><?= h($txt['disabled']) ?></div>
    <?php else: ?>

        <?php if ($errors): ?>
            <div class="alert alert-danger mb-4">
                <?php foreach ($errors as $e): ?>
                    <div><?= h($e) ?></div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form method="post" action="<?= BASE_URL ?>/auth/local-register" novalidate>
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

            <div class="mb-3">
                <label class="form-label"><?= $txt['username'] ?></label>
                <input type="text" name="username" class="form-control"
                       value="<?= h($old['username'] ?? '') ?>"
                       maxlength="50" required autocomplete="username">
            </div>
            <div class="mb-3">
                <label class="form-label"><?= $txt['email'] ?></label>
                <input type="email" name="email" class="form-control"
                       value="<?= h($old['email'] ?? '') ?>"
                       required autocomplete="email">
            </div>
            <div class="mb-3">
                <label class="form-label"><?= $txt['password'] ?></label>
                <input type="password" name="password" class="form-control"
                       minlength="8" required autocomplete="new-password">
            </div>
            <div class="mb-4">
                <label class="form-label"><?= $txt['password_confirm'] ?></label>
                <input type="password" name="password_confirm" class="form-control"
                       minlength="8" required autocomplete="new-password">
            </div>

            <button type="submit" class="btn btn-primary-altered w-100">
                <i class="fa-solid fa-user-plus me-1"></i> <?= $txt['register_btn'] ?>
            </button>
        </form>

        <p class="text-center mt-4 small" style="color:var(--neutral-500)">
            <a href="<?= BASE_URL ?>/pages/login"><?= $txt['login_link'] ?></a>
        </p>

    <?php endif; ?>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
