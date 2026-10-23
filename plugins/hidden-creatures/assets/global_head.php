<?php
// The spots of this page (admin « Hidden creatures ») for assets/hidden-creatures.js; nothing at all on a page without
// one. Marks them seen in the session: papi/find.php only counts a find of a page the visitor has opened.
require_once dirname(__DIR__) . '/inc/functions.php';

(function () {
    $config = hcConfig();
    $page   = basename((string)($_SERVER['PHP_SELF'] ?? ''), '.php');
    $lang   = getUiLang() === 'fr' ? 'fr' : 'en';
    $base   = BASE_URL . '/plugins/hidden-creatures/assets/';
    // No image: the component's own cotton ball.
    $image  = function (string $path): string { return $path === '' ? '' : BASE_URL . '/' . $path; };

    $spots = [];
    foreach ($config['spots'] as $id => $spot) {
        $creature = $config['creatures'][$spot['creature']] ?? null;
        if ($creature === null || !array_intersect([$page, '*'], $spot['pages'])) continue;
        hcMarkSeen((string)$id);
        $spots[] = [
            'id'     => (string)$id,
            'when'   => $spot['when'],
            'name'   => $creature['name_' . $lang] ?: $creature['name_fr'] ?: $creature['name_en'],
            'normal' => $image($creature['normal']),
            'click'  => $image($creature['click']),
        ];
    }
    if (!$spots) return;

    $text = [
        'fr' => [
            'found' => 'Trouvé : {name} ! {count}/{total}',
            'again' => '{name}, déjà trouvé ({count}/{total})',
            'code'  => '· Code : {code}',
            'login' => 'Connecte-toi pour qu’il compte.',
            'copy'  => 'Copier',
        ],
        'en' => [
            'found' => 'Found: {name}! {count}/{total}',
            'again' => '{name}, already found ({count}/{total})',
            'code'  => '· Code: {code}',
            'login' => 'Sign in for it to count.',
            'copy'  => 'Copy',
        ],
    ][$lang];
    $data = [
        'spots'    => $spots,
        'all'      => hcSpotIds(),
        'api'      => BASE_URL . '/papi/hidden-creatures/find',
        'csrf'     => csrfToken(),
        'signedIn' => kcIsLoggedIn(),
        'text'     => $text,
    ];
    $json  = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP;
    $mtime = function (string $f): int { return (int)@filemtime(__DIR__ . '/' . $f); };
    ?>
    <script>window.acHiddenCreatures = <?= json_encode($data, $json) ?>;</script>
    <script src="<?= h($base . 'cotton-fall.js?v=' . $mtime('cotton-fall.js')) ?>" defer></script>
    <script src="<?= h($base . 'hidden-creatures.js?v=' . $mtime('hidden-creatures.js')) ?>" defer></script>
    <?php
})();
