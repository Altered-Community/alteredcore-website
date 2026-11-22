<?php
// Offline fallback page, precached by the service worker (sw.php) and served
// when a page navigation fails because the network is unavailable.
//
// Must stay static: it is cached once and shown to every visitor, so it never
// starts a session or prints anything user-specific. The language and theme are
// picked client-side from what the site stored in localStorage.
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Robots-Tag: noindex');

$_offSiteName = getSiteName();
// Design system files the page needs; sw.php precaches the same list (offlineStylesheets()).
require_once __DIR__ . '/includes/offline-assets.php';
$_offTxt = [
    'en' => [
        'title' => 'You are offline',
        'text'  => 'This page could not be loaded because there is no network connection. Check your connection and try again.',
        'retry' => 'Try again',
    ],
    'fr' => [
        'title' => 'Vous êtes hors ligne',
        'text'  => 'Cette page n\'a pas pu être chargée faute de connexion réseau. Vérifiez votre connexion puis réessayez.',
        'retry' => 'Réessayer',
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="robots" content="noindex">
    <title><?= h($_offTxt['en']['title']) ?> — <?= h($_offSiteName) ?></title>
    <link rel="icon" type="image/png" sizes="192x192" href="<?= BASE_URL ?>/assets/favicon/web-app-manifest-192x192.png">
    <script>(function(){try{if(localStorage.getItem('acTheme')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}}());</script>
    <?php foreach (offlineStylesheets() as $_offCss): ?>
    <link rel="stylesheet" href="<?= h(dsUrl($_offCss)) ?>">
    <?php endforeach; ?>
    <style>
        body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
               padding: max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right))
                        max(1.5rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
               box-sizing: border-box; }
        .offline-card { max-width: 420px; width: 100%; padding: var(--ac-space-8) var(--ac-space-6); text-align: center; }
        .offline-card img { width: 96px; height: 96px; margin-bottom: var(--ac-space-4); }
        .offline-card h1 { font: var(--ac-font-title); margin: 0 0 var(--ac-space-3); color: var(--ac-color-text); }
        .offline-card p { font: var(--ac-font-body); line-height: 1.55; margin: 0 0 var(--ac-space-6); color: var(--ac-color-text-2); }
    </style>
</head>
<body>
    <main class="offline-card ac-card">
        <img src="<?= BASE_URL ?>/assets/favicon/web-app-manifest-192x192.png" alt="<?= h($_offSiteName) ?>">
        <h1 id="offline-title"><?= h($_offTxt['en']['title']) ?></h1>
        <p id="offline-text"><?= h($_offTxt['en']['text']) ?></p>
        <button type="button" id="offline-retry" class="ac-button"><?= h($_offTxt['en']['retry']) ?></button>
    </main>
    <script>
    (function () {
        var txt = <?= json_encode($_offTxt, JSON_UNESCAPED_UNICODE) ?>;
        var siteName = <?= json_encode($_offSiteName, JSON_UNESCAPED_UNICODE) ?>;
        // js/pwa.js stores the UI language of the last page seen; fall back to the browser language.
        var lang = null;
        try { lang = localStorage.getItem('acUiLang'); } catch (e) {}
        if (!txt[lang]) lang = (navigator.language || '').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
        var t = txt[lang];
        document.documentElement.lang = lang;
        document.title = t.title + ' — ' + siteName;
        document.getElementById('offline-title').textContent = t.title;
        document.getElementById('offline-text').textContent = t.text;
        var btn = document.getElementById('offline-retry');
        btn.textContent = t.retry;
        btn.addEventListener('click', function () { location.reload(); });
        window.addEventListener('online', function () { location.reload(); });
    }());
    </script>
</body>
</html>
