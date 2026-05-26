<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// auth guard
if (!kcIsLoggedIn()) {
    redirect(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? ''));
}
$kcUser     = kcUser();
$kcSub      = $kcUser['sub'] ?? '';
$kcUsername = $kcUser['username'] ?? $kcSub;

// translations
$txt = [
    'en' => [
        'page_title'    => 'Feedback & Bug Reports',
        'page_desc'     => 'Report a bug, suggest a feature, or ask a question about our services.',
        'form_title'    => 'Submit a request',
        'lbl_type'      => 'Request type',
        'lbl_service'   => 'Service',
        'lbl_title'     => 'Title',
        'ph_title'      => 'Summarize your request in one sentence',
        'lbl_desc'      => 'Description',
        'ph_desc'       => 'Describe the issue or idea in detail…',
        'submit'        => 'Submit',
        'type_bug'      => 'Bug report',
        'type_feature'  => 'Feature request',
        'type_question' => 'Question',
        'svc_cards'       => 'Cards API',
        'svc_decks'       => 'Decks API',
        'svc_collection'  => 'Collection API',
        'svc_ownership'   => 'Ownership',
        'svc_auth'        => 'Auth (Keycloak)',
        'svc_alteredcore' => 'alteredcore.org (website)',
        'svc_altered_re'  => 'altered.re (website)',
        'svc_bga'         => 'Board Game Arena',
        'svc_general'     => 'General',
        'err_token'     => 'Invalid form token. Please try again.',
        'err_type'      => 'Please select a request type.',
        'err_service'   => 'Please select a service.',
        'err_title_req' => 'Please enter a title.',
        'err_title_len' => 'Title must be between 5 and 100 characters.',
        'err_desc_req'  => 'Please enter a description.',
        'err_desc_len'  => 'Description must be at least 20 characters.',
        'err_api'       => 'An error occurred while submitting your request. Please try again later.',
        'err_rate'      => 'You have submitted too many requests recently. Please wait a while before trying again.',
        'rate_title'    => 'Please wait before submitting again',
        'rate_msg'      => 'You recently submitted a request. Please wait %d more minute(s) before submitting again.',
        'ok_title'      => 'Request submitted!',
        'ok_msg'        => 'Thank you for your feedback. Your request has been recorded and will be reviewed by the team.',
        'ok_link'       => 'View your submission on GitHub',
        'check_title'   => 'Before you submit',
        'check_msg'     => 'Your request may already have been reported or suggested. Take a moment to browse existing issues — you can add a comment or a 👍 instead of opening a duplicate.',
        'check_btn'     => 'Browse existing issues',
        'my_issues_btn' => 'My issues',
        'new_btn'       => 'Submit a new request',
        'lbl_link'      => 'Related link',
        'ph_link'       => 'URL, deck ID, card reference… (optional)',
        'public_warn'   => 'Do not include personal information (email, username, password…) — submissions are publicly visible on GitHub.',
    ],
    'fr' => [
        'page_title'    => 'Feedback & Signalement de bugs',
        'page_desc'     => 'Signalez un bug, proposez une fonctionnalité ou posez une question sur nos services.',
        'form_title'    => 'Soumettre une demande',
        'lbl_type'      => 'Type de demande',
        'lbl_service'   => 'Service',
        'lbl_title'     => 'Titre',
        'ph_title'      => 'Résumez votre demande en une phrase',
        'lbl_desc'      => 'Description',
        'ph_desc'       => "Décrivez le problème ou l'idée en détail…",
        'submit'        => 'Envoyer',
        'type_bug'      => 'Signalement de bug',
        'type_feature'  => 'Proposition de fonctionnalité',
        'type_question' => 'Question',
        'svc_cards'       => 'Cards API',
        'svc_decks'       => 'Decks API',
        'svc_collection'  => 'Collection API',
        'svc_ownership'   => 'Ownership',
        'svc_auth'        => 'Auth (Keycloak)',
        'svc_alteredcore' => 'alteredcore.org (site)',
        'svc_altered_re'  => 'altered.re (site)',
        'svc_bga'         => 'Board Game Arena',
        'svc_general'     => 'Général',
        'err_token'     => 'Jeton de formulaire invalide. Veuillez réessayer.',
        'err_type'      => 'Veuillez sélectionner un type de demande.',
        'err_service'   => 'Veuillez sélectionner un service.',
        'err_title_req' => 'Veuillez entrer un titre.',
        'err_title_len' => 'Le titre doit contenir entre 5 et 100 caractères.',
        'err_desc_req'  => 'Veuillez entrer une description.',
        'err_desc_len'  => 'La description doit contenir au moins 20 caractères.',
        'err_api'       => 'Une erreur est survenue lors de la soumission. Veuillez réessayer plus tard.',
        'err_rate'      => 'Vous avez soumis trop de demandes récemment. Veuillez patienter avant de réessayer.',
        'rate_title'    => 'Merci de patienter avant de soumettre à nouveau',
        'rate_msg'      => 'Vous avez récemment soumis une demande. Veuillez patienter encore %d minute(s) avant de soumettre à nouveau.',
        'ok_title'      => 'Demande envoyée !',
        'ok_msg'        => "Merci pour votre retour. Votre demande a été enregistrée et sera examinée par l'équipe.",
        'ok_link'       => 'Voir votre soumission sur GitHub',
        'check_title'   => 'Avant de soumettre',
        'check_msg'     => 'Votre demande a peut-être déjà été signalée ou proposée. Prenez un moment pour parcourir les issues existantes — vous pouvez ajouter un commentaire ou un 👍 plutôt qu\'ouvrir un doublon.',
        'check_btn'     => 'Voir les issues existantes',
        'my_issues_btn' => 'Mes issues',
        'new_btn'       => 'Soumettre une nouvelle demande',
        'lbl_link'      => 'Lien associé',
        'ph_link'       => 'URL, ID de deck, référence de carte… (optionnel)',
        'public_warn'   => 'Ne saisissez pas d\'informations personnelles (email, nom d\'utilisateur, mot de passe…) — les soumissions sont publiquement visibles sur GitHub.',
    ],
][getUiLang()] ?? [];

// allowed values
$typeMap = [
    'bug'      => ['gh_label' => 'bug',         'display' => $txt['type_bug'],      'title_prefix' => '[Bug]'],
    'feature'  => ['gh_label' => 'enhancement', 'display' => $txt['type_feature'],  'title_prefix' => '[Feature]'],
    'question' => ['gh_label' => 'question',    'display' => $txt['type_question'], 'title_prefix' => '[Question]'],
];
$serviceMap = [
    'general'      => ['gh_label' => 'general',                 'display' => $txt['svc_general'],    'body_name' => 'General'],
    'cards-api'    => ['gh_label' => 'cards-api',               'display' => $txt['svc_cards'],      'body_name' => 'Cards API'],
    'decks-api'    => ['gh_label' => 'decks-api',               'display' => $txt['svc_decks'],      'body_name' => 'Decks API'],
    'collection'   => ['gh_label' => 'collection-api',          'display' => $txt['svc_collection'], 'body_name' => 'Collection API'],
    'bga'          => ['gh_label' => 'bga',                     'display' => $txt['svc_bga'],        'body_name' => 'Board Game Arena'],
    'ownership'    => ['gh_label' => 'ownership',               'display' => $txt['svc_ownership'],  'body_name' => 'Ownership'],
    'auth'         => ['gh_label' => 'auth',                    'display' => $txt['svc_auth'],       'body_name' => 'Auth (Keycloak)'],
    'alteredcore'  => ['gh_label' => 'alteredcore.org website', 'display' => $txt['svc_alteredcore'],'body_name' => 'alteredcore.org (website)'],
    'altered-re'   => ['gh_label' => 'altered.re website',      'display' => $txt['svc_altered_re'], 'body_name' => 'altered.re (website)'],
];

// rate limit check (1 submission per 10 min per user)
$_rateLimitSecs = 600;
$_db     = getDB();
$_rlStmt = $_db->prepare(q('SELECT last_at FROM {feedback_rate_limit} WHERE kc_sub = ?'));
$_rlStmt->execute([$kcSub]);
$_rlRow  = $_rlStmt->fetch();
$_lastAt = $_rlRow ? (int)$_rlRow['last_at'] : 0;
$_elapsed  = $_lastAt > 0 ? (time() - $_lastAt) : PHP_INT_MAX;
$isRateLimited   = $_elapsed < $_rateLimitSecs;
$waitSecondsLeft = $isRateLimited ? ($_rateLimitSecs - $_elapsed) : 0;

// form handling
$errors   = [];
$success  = false;
$issueUrl = '';
$form     = ['type' => '', 'service' => '', 'title' => '', 'description' => '', 'link' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = $txt['err_token'];
    } elseif (!empty($_POST['_hp'])) {
        // Honeypot triggered — silent discard
        $success = true;
    } elseif ($isRateLimited) {
        $errors[] = $txt['err_rate'];
    } else {
        $type    = trim($_POST['type']        ?? '');
        $service = trim($_POST['service']     ?? '');
        $title   = trim($_POST['title']       ?? '');
        $desc    = trim($_POST['description'] ?? '');
        $link    = trim($_POST['link']        ?? '');

        $form = compact('type', 'service', 'title', 'link') + ['description' => $desc];

        if (!isset($typeMap[$type]))       $errors[] = $txt['err_type'];
        if (!isset($serviceMap[$service])) $errors[] = $txt['err_service'];

        if ($title === '') {
            $errors[] = $txt['err_title_req'];
        } elseif (mb_strlen($title) < 5 || mb_strlen($title) > 100) {
            $errors[] = $txt['err_title_len'];
        }
        if ($desc === '') {
            $errors[] = $txt['err_desc_req'];
        } elseif (mb_strlen($desc) < 20) {
            $errors[] = $txt['err_desc_len'];
        }

        if (empty($errors)) {
            $issueUrl = feedbackCreateGitHubIssue($type, $service, $title, $desc, $link, $typeMap, $serviceMap, $kcUsername);
            if ($issueUrl === null) {
                $errors[] = $txt['err_api'];
            } else {
                // Record submission timestamp in DB
                $_upStmt = $_db->prepare(q('INSERT INTO {feedback_rate_limit} (kc_sub, last_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_at = VALUES(last_at)'));
                $_upStmt->execute([$kcSub, time()]);
                $isRateLimited   = true;
                $waitSecondsLeft = $_rateLimitSecs;
                $success = true;
                $form    = ['type' => '', 'service' => '', 'title' => '', 'description' => ''];
            }
        }
    }
}

function feedbackGetGitHubToken(): ?string
{
    if (!defined('GITHUB_APP_ID') || !defined('GITHUB_APP_INSTALLATION_ID') || !defined('GITHUB_APP_PRIVATE_KEY') || GITHUB_APP_PRIVATE_KEY === '') {
        return null;
    }
    $key = openssl_pkey_get_private(GITHUB_APP_PRIVATE_KEY);
    if ($key === false) {
        return null;
    }

    $now    = time();
    $b64url = function (string $s): string {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    };
    $header  = $b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $payload = $b64url(json_encode(['iat' => $now - 60, 'exp' => $now + 300, 'iss' => (int)GITHUB_APP_ID]));

    openssl_sign($header . '.' . $payload, $sig, $key, OPENSSL_ALGO_SHA256);
    $jwt = $header . '.' . $payload . '.' . $b64url($sig);

    $ch = curl_init('https://api.github.com/app/installations/' . GITHUB_APP_INSTALLATION_ID . '/access_tokens');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => '{}',
        CURLOPT_HTTPHEADER     => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $jwt,
            'Content-Type: application/json',
            'User-Agent: alteredcore-website',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201 || $response === false) {
        return null;
    }
    $data = json_decode($response, true);
    return isset($data['token']) ? $data['token'] : null;
}

function feedbackCreateGitHubIssue(
    string $type,
    string $service,
    string $title,
    string $desc,
    string $link,
    array $typeMap,
    array $serviceMap,
    string $username
): ?string {
    if (!defined('GITHUB_REPO')) {
        return null;
    }
    $token = feedbackGetGitHubToken();
    if ($token === null) {
        return null;
    }

    $titlePrefix     = $typeMap[$type]['title_prefix']    ?? '[' . $type . ']';
    $serviceBodyName = $serviceMap[$service]['body_name'] ?? $service;

    $bodyParts = [
        '### Service',
        $serviceBodyName,
        '',
        '### Description',
        $desc,
    ];
    if ($link !== '') {
        $bodyParts[] = '';
        $bodyParts[] = '### Related link';
        $bodyParts[] = preg_replace('/([\\\\*_`\[\]<>&|#!])/', '\\\\$1', $link);
    }
    $bodyParts[] = '';
    $bodyParts[] = '---';
    $bodyParts[] = '*Submitted via ' . getSiteName() . ' by ' . preg_replace('/([\\\\*_`\[\]<>&|#!])/', '\\\\$1', $username) . '*';

    $body = implode("\n", $bodyParts);

    $payload = json_encode([
        'title'  => $titlePrefix . ' ' . $title,
        'body'   => $body,
        'labels' => [$typeMap[$type]['gh_label'], $serviceMap[$service]['gh_label']],
    ]);

    $ch = curl_init('https://api.github.com/repos/' . GITHUB_REPO . '/issues');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'User-Agent: alteredcore-website',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_TIMEOUT        => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201 || $response === false) {
        return null;
    }

    $data = json_decode($response, true);
    return isset($data['html_url']) ? $data['html_url'] : null;
}

// page metadata
$pageTitle       = $txt['page_title'];
$pageDescription = $txt['page_desc'];
include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4" style="max-width:640px">

    <div class="section-title mb-3"><span><?= h($txt['form_title']) ?></span></div>
    <p class="text-muted mb-4"><?= h($txt['page_desc']) ?></p>

    <?php if ($success): ?>
        <div class="alert alert-success">
            <strong><?= h($txt['ok_title']) ?></strong><br>
            <?= h($txt['ok_msg']) ?>
            <?php if ($issueUrl): ?>
                <div class="mt-2">
                    <a href="<?= h($issueUrl) ?>" target="_blank" rel="noopener">
                        <i class="fa-brands fa-github me-1"></i><?= h($txt['ok_link']) ?>
                    </a>
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <?php if (!$success): ?>

    <?php if ($errors): ?>
        <div class="alert alert-danger">
            <?php foreach ($errors as $e): ?>
                <div><?= h($e) ?></div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if ($isRateLimited): ?>
    <!-- Rate limit: show waiting message, hide form -->
    <div class="card-altered p-4 mb-4 text-center">
        <i class="fa-solid fa-clock" style="font-size:2.5rem;color:var(--neutral-300);margin-bottom:1rem;display:block"></i>
        <h5 class="mb-2"><?= h($txt['rate_title']) ?></h5>
        <p class="text-muted mb-0"><?= h(sprintf($txt['rate_msg'], (int)ceil($waitSecondsLeft / 60))) ?></p>
    </div>
    <?php else: ?>

    <?php $showFormDirectly = !empty($errors); ?>

    <!-- Check existing issues first -->
    <div id="check-first" class="card-altered p-4 mb-4"
         <?= $showFormDirectly ? 'style="display:none"' : '' ?>>
        <h5 class="mb-2">
            <i class="fa-brands fa-github me-2"></i><?= h($txt['check_title']) ?>
        </h5>
        <p class="text-muted mb-3" style="font-size:.95em"><?= h($txt['check_msg']) ?></p>
        <div class="d-flex flex-wrap gap-2">
            <a href="https://github.com/<?= defined('GITHUB_REPO') ? h(GITHUB_REPO) : '' ?>/issues"
               target="_blank" rel="noopener"
               class="btn btn-outline-secondary btn-sm">
                <i class="fa-brands fa-github me-1"></i><?= h($txt['check_btn']) ?>
            </a>
            <a href="https://github.com/<?= defined('GITHUB_REPO') ? h(GITHUB_REPO) : '' ?>/issues?q=is%3Aissue%20<?= rawurlencode($kcUsername) ?>"
               target="_blank" rel="noopener"
               class="btn btn-outline-secondary btn-sm">
                <i class="fa-brands fa-github me-1"></i><?= h($txt['my_issues_btn']) ?>
            </a>
            <button type="button" id="show-form-btn" class="btn btn-primary-altered btn-sm">
                <i class="fa-solid fa-pen me-1"></i><?= h($txt['new_btn']) ?>
            </button>
        </div>
    </div>

    <!-- Form (hidden until user clicks "Submit a new request") -->
    <div id="feedback-form-wrapper" <?= $showFormDirectly ? '' : 'style="display:none"' ?>>
    <form method="post" class="card-altered p-4" novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <!-- Honeypot: hidden from real users, bots fill it -->
        <input type="text" name="_hp" value="" style="display:none" tabindex="-1" autocomplete="off">

        <div class="mb-3">
            <label class="form-label fw-semibold">
                <?= h($txt['lbl_type']) ?> <span class="text-danger">*</span>
            </label>
            <select name="type" class="form-select" required>
                <option value="" disabled <?= $form['type'] === '' ? 'selected' : '' ?>></option>
                <?php foreach ($typeMap as $key => $t): ?>
                    <option value="<?= h($key) ?>" <?= $form['type'] === $key ? 'selected' : '' ?>>
                        <?= h($t['display']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">
                <?= h($txt['lbl_service']) ?> <span class="text-danger">*</span>
            </label>
            <select name="service" class="form-select" required>
                <option value="" disabled <?= $form['service'] === '' ? 'selected' : '' ?>></option>
                <?php foreach ($serviceMap as $key => $s): ?>
                    <option value="<?= h($key) ?>" <?= $form['service'] === $key ? 'selected' : '' ?>>
                        <?= h($s['display']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">
                <?= h($txt['lbl_title']) ?> <span class="text-danger">*</span>
            </label>
            <input type="text"
                   name="title"
                   class="form-control"
                   placeholder="<?= h($txt['ph_title']) ?>"
                   value="<?= h($form['title']) ?>"
                   maxlength="100"
                   required>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">
                <?= h($txt['lbl_desc']) ?> <span class="text-danger">*</span>
            </label>
            <textarea name="description"
                      class="form-control"
                      rows="7"
                      placeholder="<?= h($txt['ph_desc']) ?>"
                      required><?= h($form['description']) ?></textarea>
        </div>

        <div class="mb-4">
            <label class="form-label fw-semibold">
                <?= h($txt['lbl_link']) ?>
            </label>
            <input type="text"
                   name="link"
                   class="form-control"
                   placeholder="<?= h($txt['ph_link']) ?>"
                   value="<?= h($form['link']) ?>"
                   maxlength="500">
        </div>

        <p class="text-danger small mb-3">
            <i class="fa-solid fa-triangle-exclamation me-1"></i><?= h($txt['public_warn']) ?>
        </p>

        <button type="submit" class="btn btn-primary-altered">
            <i class="fa-solid fa-paper-plane me-1"></i> <?= h($txt['submit']) ?>
        </button>
    </form>
    </div><!-- /feedback-form-wrapper -->

    <?php endif; // !$isRateLimited ?>
    <?php endif; // !$success ?>

</div>

<script>
(function () {
    var btn     = document.getElementById('show-form-btn');
    var check   = document.getElementById('check-first');
    var wrapper = document.getElementById('feedback-form-wrapper');
    if (btn) {
        btn.addEventListener('click', function () {
            check.style.display   = 'none';
            wrapper.style.display = '';
        });
    }
}());
</script>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
