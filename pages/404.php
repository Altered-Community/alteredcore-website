<?php
http_response_code(404);
$pageTitle  = '404 — Page not found';
$pageRobots = 'noindex, nofollow';
include dirname(__DIR__) . '/includes/header.php';

// translations
$txt = [
    'en' => [
        'code'  => '404',
        'title' => 'Page not found',
        'text'  => 'The page you are looking for does not exist or is not accessible.',
        'back'  => 'Back to homepage',
    ],
    'fr' => [
        'code'  => '404',
        'title' => 'Page introuvable',
        'text'  => 'La page que vous recherchez n\'existe pas ou n\'est pas accessible.',
        'back'  => 'Retour à l\'accueil',
    ],
][getUiLang()] ?? [];
?>

<div class="container py-5 text-center">
    <div style="font-size:6rem;font-weight:900;color:var(--neutral-200);line-height:1;margin-bottom:1rem"><?= $txt['code'] ?></div>
    <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:.75rem"><?= h($txt['title']) ?></h1>
    <p class="text-muted mb-4"><?= h($txt['text']) ?></p>
    <a href="<?= BASE_URL ?>/" class="btn btn-primary-altered">
        <i class="fa-solid fa-house me-1"></i><?= h($txt['back']) ?>
    </a>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
