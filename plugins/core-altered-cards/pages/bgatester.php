<?php
require_once __DIR__ . '/../includes/functions.php';
$uiLang = getUiLang();

// Secret opt-in page for the BGA test team. It is intentionally NOT registered in
// the navigation menu: it is reachable only by its direct URL (/pages/bgatester).
// The button below sets a persistent flag (localStorage "bgatester" = "true") which
// makes the hidden "Test" deck format appear in the deckbuilder and decks-list filters.

$txt = [
    'en' => [
        'page_title'  => 'Test Team',
        'welcome'     => 'Welcome to the test team! To enable the test format in the deckbuilder, click the button below:',
        'activate'    => 'Enable test format',
        'deactivate'  => 'Disable test format',
        'active_msg'  => 'The test format is enabled for this session. Open the deckbuilder to use it.',
        'open_db'     => 'Open the deckbuilder',
    ],
    'fr' => [
        'page_title'  => 'Équipe de tests',
        'welcome'     => "Bienvenue dans l'équipe de tests, pour activer le format de test dans le deckbuilder, cliquez sur le bouton suivant :",
        'activate'    => 'Activer le format de test',
        'deactivate'  => 'Désactiver le format de test',
        'active_msg'  => 'Le format de test est activé pour cette session. Ouvrez le deckbuilder pour l\'utiliser.',
        'open_db'     => 'Ouvrir le deckbuilder',
    ],
][$uiLang] ?? [];
// fall back to English for any missing key
$txt += [
    'page_title' => 'Test Team',
    'welcome'    => 'Welcome to the test team! To enable the test format in the deckbuilder, click the button below:',
    'activate'   => 'Enable test format',
    'deactivate' => 'Disable test format',
    'active_msg' => 'The test format is enabled for this session. Open the deckbuilder to use it.',
    'open_db'    => 'Open the deckbuilder',
];

$pageTitle = $txt['page_title'];
?>
<section class="container py-5">
    <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">
            <div class="card-altered p-4 text-center">
                <i class="fa-solid fa-flask fa-2x mb-3" style="color:var(--primary-400)"></i>
                <h1 class="h4 mb-3"><?= h($txt['page_title']) ?></h1>
                <p class="mb-4"><?= h($txt['welcome']) ?></p>

                <div class="d-flex flex-column align-items-center gap-3">
                    <button type="button" id="bga-activate" class="btn btn-primary-altered">
                        <i class="fa-solid fa-flask me-1"></i><?= h($txt['activate']) ?>
                    </button>

                    <div id="bga-active-block" style="display:none">
                        <div class="alert alert-success mb-3">
                            <i class="fa-solid fa-circle-check me-1"></i><?= h($txt['active_msg']) ?>
                        </div>
                        <div class="d-flex flex-column align-items-center gap-2">
                            <a href="<?= h(BASE_URL) ?>/pages/deckbuilder" class="btn btn-primary-altered">
                                <i class="fa-solid fa-layer-group me-1"></i><?= h($txt['open_db']) ?>
                            </a>
                            <button type="button" id="bga-deactivate" class="btn btn-sm btn-outline-secondary">
                                <?= h($txt['deactivate']) ?>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
(function () {
    var KEY        = 'bgatester';
    var btnOn      = document.getElementById('bga-activate');
    var btnOff     = document.getElementById('bga-deactivate');
    var activeBlk  = document.getElementById('bga-active-block');

    function isActive() {
        try { return localStorage.getItem(KEY) === 'true'; } catch (e) { return false; }
    }
    function render() {
        var on = isActive();
        btnOn.style.display     = on ? 'none' : '';
        activeBlk.style.display = on ? '' : 'none';
    }

    btnOn.addEventListener('click', function () {
        try { localStorage.setItem(KEY, 'true'); } catch (e) {}
        render();
    });
    btnOff.addEventListener('click', function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        render();
    });

    render();
})();
</script>
