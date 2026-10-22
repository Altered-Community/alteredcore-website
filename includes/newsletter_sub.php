<?php
// Newsletter subscription — self-contained module included from pages/index.php.
//
// Phase 1 (runs at include time, before any HTML output):
//   Handles POST submission and redirects. When Listmonk is configured
//   (LISTMONK_URL, see includes/listmonk.php) the address is subscribed there,
//   confirmed, to the list of the language the visitor is reading in; the
//   local newsletter_sub table is only the fallback without Listmonk.
//
// Phase 2 (called explicitly in the HTML section):
//   renderNewsletterBlock() outputs the signup form.
//
// To remove the newsletter entirely: delete this file and the two lines in
// index.php that reference it (the require_once and the renderNewsletterBlock call).

require_once __DIR__ . '/listmonk.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['nl_subscribe'])) {
    $nlLang = getUiLang();
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid form token. Please try again.', 'error');
    } else {
        // « Utiliser l'adresse de mon compte »: the address comes from the session, never from the page, so the page
        // never has to show it.
        $nlEmail = !empty($_POST['nl_use_account']) ? newsletterAccountEmail() : trim($_POST['nl_email'] ?? '');
        if (!filter_var($nlEmail, FILTER_VALIDATE_EMAIL)) {
            flash($nlLang === 'fr'
                ? 'Veuillez saisir une adresse e-mail valide.'
                : 'Please enter a valid email address.', 'error');
        } elseif (listmonkEnabled()) {
            $nlUser = kcIsLoggedIn() ? kcUser() : [];
            $nlResult = listmonkSubscribe($nlEmail,
                ($nlUser['username'] ?? '') ?: strstr($nlEmail, '@', true), $nlLang, array_filter([
                    'lang'          => $nlLang,
                    'lang_source'   => 'website',
                    'source'        => 'website_home',
                    'keycloak_id'   => $nlUser['sub'] ?? '',
                    'subscribed_at' => gmdate('Y-m-d'),
                ]));
            if ($nlResult === 'subscribed') {
                flash($nlLang === 'fr' ? 'Inscription confirmée, merci !' : 'Subscription confirmed, thank you!');
            } elseif ($nlResult === 'already') {
                flash($nlLang === 'fr' ? 'Cette adresse est déjà inscrite.' : 'This email is already subscribed.');
            } elseif ($nlResult === 'blocklisted') {
                flash($nlLang === 'fr'
                    ? 'Cette adresse ne peut pas être inscrite. Contactez-nous s\'il s\'agit d\'une erreur.'
                    : 'This address cannot be subscribed. Contact us if this is a mistake.', 'error');
            } else {
                flash($nlLang === 'fr'
                    ? 'Le service de newsletter n\'a pas répondu. Réessayez plus tard.'
                    : 'The newsletter service did not answer. Please try again later.', 'error');
            }
        } else {
            $nlStmt = getDB()->prepare(q("INSERT IGNORE INTO {newsletter_sub} (email) VALUES (:email)"));
            $nlStmt->execute([':email' => $nlEmail]);
            flash($nlStmt->rowCount() > 0
                ? ($nlLang === 'fr' ? 'Inscription confirmée, merci !' : 'Subscription confirmed, thank you!')
                : ($nlLang === 'fr' ? 'Cette adresse est déjà inscrite.' : 'This email is already subscribed.'));
        }
    }
    redirect(BASE_URL . '/');
}

/** E-mail address of the signed-in account (Keycloak or local), '' when signed out. */
function newsletterAccountEmail(): string
{
    if (!empty($_SESSION['kc_logged_in'])) return (string)($_SESSION['kc_email'] ?? '');
    if (!empty($_SESSION['local_logged_in'])) return (string)($_SESSION['local_email'] ?? '');
    return '';
}

function renderNewsletterBlock(): void
{
    $txt = [
        'en' => [
            'title'       => 'Stay informed',
            'desc'        => 'Subscribe to our newsletter and receive the latest Altered Re:Union news directly in your inbox.',
            'placeholder' => 'Your email address',
            'btn'         => 'Subscribe',
            'privacy'     => 'Your email is only used to send you news. No spam, unsubscribe anytime.',
            'use_account' => 'Use my account address',
        ],
        'fr' => [
            'title'       => 'Restez informé',
            'desc'        => 'Abonnez-vous à la newsletter et recevez les dernières actualités d\'Altered Re:Union directement dans votre boîte mail.',
            'placeholder' => 'Votre adresse e-mail',
            'btn'         => 'S\'abonner',
            'privacy'     => 'Votre e-mail est uniquement utilisé pour vous envoyer les actualités. Pas de spam, désinscription à tout moment.',
            'use_account' => 'Utiliser l\'adresse de mon compte',
        ],
    ][getUiLang()] ?? [];

    // The field is never filled with the account's address: someone filming or streaming the homepage would show it.
    $hasAccountEmail = filter_var(newsletterAccountEmail(), FILTER_VALIDATE_EMAIL) !== false;
    ?>
    <section class="container py-4">
        <div class="card-altered p-4">
            <div class="row align-items-center g-4">
                <div class="col-lg-6">
                    <div class="d-flex align-items-center gap-3 mb-2">
                        <i class="fa-solid fa-envelope fa-lg" style="color:var(--primary-400)"></i>
                        <div class="section-title mb-0"><span><?= $txt['title'] ?></span></div>
                    </div>
                    <p class="text-muted mb-0"><?= $txt['desc'] ?></p>
                </div>
                <div class="col-lg-6">
                    <form method="post" novalidate class="d-flex gap-2 flex-wrap align-items-start">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="nl_subscribe" value="1">
                        <div class="flex-grow-1" style="min-width:220px">
                            <input type="email" name="nl_email" class="form-control" autocomplete="off"
                                   aria-label="<?= h($txt['placeholder']) ?>"
                                   placeholder="<?= h($txt['placeholder']) ?>" required>
                        </div>
                        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
                            <i class="fa-solid fa-paper-plane me-1"></i> <?= $txt['btn'] ?>
                        </button>
                        <?php if ($hasAccountEmail): ?>
                        <div class="w-100">
                            <button type="submit" name="nl_use_account" value="1"
                                    class="ac-button ac-button--ghost ac-button--sm"><?= h($txt['use_account']) ?></button>
                        </div>
                        <?php endif; ?>
                    </form>
                    <p class="text-muted mt-2 mb-0" style="font-size:.8rem">
                        <i class="fa-solid fa-lock me-1"></i><?= $txt['privacy'] ?>
                    </p>
                </div>
            </div>
        </div>
    </section>
    <?php
}
