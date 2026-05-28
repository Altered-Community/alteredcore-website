<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

$useLocalAuth = !defined('KC_URL') || KC_URL === '';

$txt = [
    'en' => [
        'login_title'         => 'My Account',
        'login_subtitle_kc'   => 'Sign in or create your Altered.re account.',
        'login_subtitle_local'=> 'Sign in to your account.',
        'login_existing_desc' => 'Already have an account? Sign in.',
        'login_register'      => 'Create an account',
        'login_register_desc' => 'New to ' . (defined('SITE_NAME') ? SITE_NAME : 'this site') . '? Join for free.',
        'login_kc_note'       => 'Authentication powered by Altered.re platform.',
        'email_or_username'   => 'Email or username',
        'password'            => 'Password',
        'remember_me'         => 'Remember me',
        'sign_in_btn'         => 'Sign in',
        'no_account'          => 'No account yet?',
        'create_account'      => 'Create one',
        'nav_login'           => 'Sign in',
    ],
    'fr' => [
        'login_title'         => 'Mon compte',
        'login_subtitle_kc'   => 'Connectez-vous ou créez votre compte Altered.re.',
        'login_subtitle_local'=> 'Connectez-vous à votre compte.',
        'login_existing_desc' => 'Vous avez déjà un compte ? Connectez-vous.',
        'login_register'      => 'Créer un compte',
        'login_register_desc' => 'Nouveau sur ' . (defined('SITE_NAME') ? SITE_NAME : 'ce site') . ' ? Rejoignez-nous gratuitement.',
        'login_kc_note'       => 'Authentification via la plateforme Altered.re.',
        'email_or_username'   => 'Email ou pseudo',
        'password'            => 'Mot de passe',
        'remember_me'         => 'Se souvenir de moi',
        'sign_in_btn'         => 'Se connecter',
        'no_account'          => 'Pas encore de compte ?',
        'create_account'      => 'Créez-en un',
        'nav_login'           => 'Connexion',
    ],
][getUiLang()] ?? [];

if (kcIsLoggedIn()) {
    redirect(BASE_URL . '/');
}

$pageTitle = $txt['login_title'];
$kcError   = isset($_GET['kc_error']) ? htmlspecialchars($_GET['kc_error']) : null;
$flash     = getFlash();

include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4" style="max-width:<?= $useLocalAuth ? '480' : '640' ?>px">
    <div class="text-center mb-5">
        <h1 class="section-title"><span><?= $txt['login_title'] ?></span></h1>
        <p style="color:var(--neutral-500)">
            <?= $useLocalAuth ? $txt['login_subtitle_local'] : $txt['login_subtitle_kc'] ?>
        </p>
    </div>

    <?php if ($kcError): ?>
        <div class="alert alert-danger mb-4"><?= $kcError ?></div>
    <?php endif; ?>
    <?php if ($flash): ?>
        <div class="alert alert-<?= h($flash['type']) ?> mb-4"><?= h($flash['msg']) ?></div>
    <?php endif; ?>

    <?php if ($useLocalAuth): ?>

        <form method="post" action="<?= BASE_URL ?>/auth/local-login" novalidate>
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <div class="mb-3">
                <label class="form-label"><?= $txt['email_or_username'] ?></label>
                <input type="text" name="identifier" class="form-control"
                       required autocomplete="username" autofocus>
            </div>
            <div class="mb-3">
                <label class="form-label"><?= $txt['password'] ?></label>
                <input type="password" name="password" class="form-control"
                       required autocomplete="current-password">
            </div>
            <div class="mb-4 form-check">
                <input type="checkbox" name="remember_me" id="rememberMe"
                       class="form-check-input" value="1">
                <label class="form-check-label" for="rememberMe"><?= $txt['remember_me'] ?></label>
            </div>
            <button type="submit" class="btn btn-primary-altered w-100">
                <i class="fa-solid fa-right-to-bracket me-1"></i> <?= $txt['sign_in_btn'] ?>
            </button>
        </form>

        <?php if (!defined('LOCAL_ALLOW_REGISTER') || LOCAL_ALLOW_REGISTER): ?>
        <p class="text-center mt-4 small" style="color:var(--neutral-500)">
            <?= $txt['no_account'] ?>
            <a href="<?= BASE_URL ?>/pages/register"><?= $txt['create_account'] ?></a>
        </p>
        <?php endif; ?>

    <?php else: ?>

        <div class="d-flex flex-column gap-3">

            <a href="<?= BASE_URL ?>/auth/keycloak-login" class="login-option text-decoration-none">
                <div class="login-option-icon">
                    <i class="fa-solid fa-right-to-bracket"></i>
                </div>
                <div class="login-option-body">
                    <div class="login-option-title"><?= $txt['nav_login'] ?></div>
                    <div class="login-option-desc"><?= $txt['login_existing_desc'] ?></div>
                </div>
                <i class="fa-solid fa-chevron-right login-option-arrow"></i>
            </a>

            <a href="<?= BASE_URL ?>/auth/keycloak-login?action=register"
               class="login-option login-option--register text-decoration-none">
                <div class="login-option-icon">
                    <i class="fa-solid fa-user-plus"></i>
                </div>
                <div class="login-option-body">
                    <div class="login-option-title"><?= $txt['login_register'] ?></div>
                    <div class="login-option-desc"><?= $txt['login_register_desc'] ?></div>
                </div>
                <i class="fa-solid fa-chevron-right login-option-arrow"></i>
            </a>

        </div>

        <p class="text-center mt-5 small" style="color:var(--neutral-500)">
            <i class="fa-solid fa-shield-halved me-1"></i>
            <?= $txt['login_kc_note'] ?>
        </p>

    <?php endif; ?>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
