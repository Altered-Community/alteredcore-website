<?php
// Community vote as a tier list: every deck is a tile (hero picture, builder, difficulty colour, archetype emoji) that
// the voter drags into S…D, or leaves in the pool. Nothing is required: only the decks placed count. Moves are saved one by one (papi/vote.php), so the voter can stop whenever.
loginRequired();
require_once __DIR__ . '/../inc/functions.php';

$userId = (int)($_SESSION['user_id'] ?? 0);
$state  = dcvState();
$lang   = getUiLang();

$txt = [
    'en' => [
        'title'        => 'Decks contest: vote',
        'rules_title'  => 'How to rate',
        'rules'        => [
            'Put at the top the decks you most want to both play and face. We want decks that are not frustrating to face and as strong as possible, so that players can come to an Altered night without losing every game.',
            'The 6 decks must be balanced against each other, so we will align on the weakest one: a very strong deck will be toned down. Do not penalise a hero because it looks weak (Gretel, Moyo…): if it is not picked this time, it can still be picked in the next contest.',
            'Drag a deck into a tier, or tap a deck then tap a tier. Place only the decks you want: you can stop whenever, the decks left in the pool are simply not rated. Your ballot is saved at each move and you can change it until the vote closes.',
        ],
        'legend'       => 'Difficulty and deck type',
        'pool'         => 'Decks to rank',
        'pool_hint'    => 'Drag them into the tiers above, or tap one then a tier.',
        'all'          => 'All',
        'tiers'        => ['S' => 'I want it', 'A' => 'Very good', 'B' => 'Fine', 'C' => 'Meh', 'D' => 'No'],
        'details'      => 'Decklist',
        'open_deck'    => 'Open on altered.re',
        'by'           => 'by',
        'why'          => 'Builder\'s notes',
        'place_here'   => 'Place the selected deck here',
        'saved'        => 'Saved · %d deck(s) ranked',
        'save_error'   => 'Could not save, please try again.',
        'before'       => 'The vote opens on %s (Paris time).',
        'closed'       => 'The vote is closed. Thank you!',
        'empty'        => 'No deck to vote on yet.',
        'close'        => 'Close',
        'types'        => ['CHARACTER' => 'Characters', 'SPELL' => 'Spells', 'LANDMARK_PERMANENT' => 'Permanents', 'EXPEDITION_PERMANENT' => 'Expedition permanents'],
        'difficulty'   => ['Easy' => 'Easy', 'Medium' => 'Medium', 'Complex' => 'Complex'],
        'no_decklist'  => 'The decklist is not available yet.',
    ],
    'fr' => [
        'title'        => 'Concours de decks : vote',
        'rules_title'  => 'Comment noter',
        'rules'        => [
            'Mets en haut du classement les decks qui te font le plus envie à la fois de jouer et d\'affronter. On veut des decks pas frustrants à affronter et les plus forts possible, pour que les joueurs puissent venir à une soirée Altered sans perdre toutes leurs parties.',
            'Les 6 decks doivent être équilibrés entre eux, donc on s\'alignera sur le moins fort : un deck très puissant sera revu à la baisse. Ne pénalise pas un héros parce qu\'il te semble faible (Gretel, Moyo…) : s\'il n\'est pas choisi cette fois, il pourra l\'être au prochain concours.',
            'Glisse un deck dans une tier, ou touche un deck puis une tier. Ne place que les decks que tu veux : tu peux t\'arrêter quand tu veux, les decks restés dans la réserve ne sont simplement pas notés. Ton vote est enregistré à chaque déplacement et tu peux le modifier jusqu\'à la fermeture.',
        ],
        'legend'       => 'Difficulté et type de deck',
        'pool'         => 'Decks à classer',
        'pool_hint'    => 'Glisse-les dans les tiers ci-dessus, ou touche-en un puis une tier.',
        'all'          => 'Tous',
        'tiers'        => ['S' => 'Je le veux', 'A' => 'Très bon', 'B' => 'Correct', 'C' => 'Bof', 'D' => 'Non'],
        'details'      => 'Decklist',
        'open_deck'    => 'Ouvrir sur altered.re',
        'by'           => 'par',
        'why'          => 'Notes du builder',
        'place_here'   => 'Placer le deck sélectionné ici',
        'saved'        => 'Enregistré · %d deck(s) classé(s)',
        'save_error'   => 'Enregistrement impossible, réessaie.',
        'before'       => 'Le vote ouvre le %s (heure de Paris).',
        'closed'       => 'Le vote est terminé. Merci !',
        'empty'        => 'Aucun deck à voter pour l\'instant.',
        'close'        => 'Fermer',
        'types'        => ['CHARACTER' => 'Personnages', 'SPELL' => 'Sorts', 'LANDMARK_PERMANENT' => 'Permanents', 'EXPEDITION_PERMANENT' => 'Permanents d\'expédition'],
        'difficulty'   => ['Easy' => 'Facile', 'Medium' => 'Moyen', 'Complex' => 'Complexe'],
        'no_decklist'  => 'La decklist n\'est pas encore disponible.',
    ],
][$lang];

$decks = dcvFillMissingDecks(dcvDecks());
$app   = [];
foreach ($decks as $d) {
    $data = json_decode((string)$d['data'], true)[$lang] ?? null;
    $app[] = [
        'id'          => $d['id'],
        'faction'     => $d['faction'],
        'author'      => $d['author'],
        'difficulty'  => $d['difficulty'],
        'archetypes'  => dcvArchetypes($d['archetype']),
        'url'         => $d['url'],
        'explanation' => (string)$d['explanation'],
        'hero'        => ($data['hero'] ?? '') !== '' ? $data['hero'] : $d['hero'],
        'hero_ref'    => $data['hero_ref'] ?? '',
        'cards'       => $data['cards'] ?? [],
    ];
}

[$opens]   = dcvWindow();
$pageTitle = $txt['title'];
$payload   = [
    'csrf'   => csrfToken(),
    'api'    => BASE_URL . '/papi/deck-contest-vote/vote',
    'cdn'    => defined('CDN_URL') ? CDN_URL : '',
    'lang'   => $lang,
    'state'  => $state,
    'tiers'  => array_map(fn($points, $letter) => ['points' => $points, 'letter' => $letter, 'label' => $txt['tiers'][$letter]], array_keys(DCV_TIERS), DCV_TIERS),
    'decks'  => $app,
    'votes'  => (object)dcvUserVotes($userId),
    'placed' => dcvPlacedCount($userId),
    'txt'    => $txt,
];
// Same look as the Discord tags the jury uses.
$emoji = ['Easy' => '🟩', 'Medium' => '🟧', 'Complex' => '🟥', 'Combo' => '⚙️', 'Aggro' => '🐺', 'Balanced' => '⚖️', 'Control' => '🧠', 'Buildup' => '🏛️', 'WIP' => '🚧'];
$payload['emoji'] = $emoji;
?>
<div class="ac-page dcv-page">
    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($pageTitle) ?></h1>
        </div>
    </header>

    <?php if ($state === 'before'): ?>
        <div class="ac-notice ac-notice--warning" role="status">
            <?= ac_icon('clock') ?>
            <div><p><?= h(sprintf($txt['before'], $opens ? $opens->format('d/m/Y H:i') : '')) ?></p></div>
        </div>
    <?php elseif ($state === 'closed'): ?>
        <div class="ac-notice" role="status"><?= ac_icon('circle-check') ?><div><p><?= h($txt['closed']) ?></p></div></div>
    <?php endif; ?>

    <?php if (!$app): ?>
        <p class="ac-text-muted"><?= h($txt['empty']) ?></p>
    <?php else: ?>
    <section class="ac-card dcv-rules">
        <h2 class="ac-section-title"><?= ac_icon('info') ?> <?= h($txt['rules_title']) ?></h2>
        <ul>
            <?php foreach ($txt['rules'] as $rule): ?><li><?= h($rule) ?></li><?php endforeach; ?>
        </ul>
        <p class="dcv-legend ac-text-small ac-text-muted">
            <strong><?= h($txt['legend']) ?></strong>
            <?php foreach (['Easy', 'Medium', 'Complex'] as $k): ?><span><?= $emoji[$k] ?> <?= h($txt['difficulty'][$k]) ?></span><?php endforeach; ?>
            <?php foreach (['Combo', 'Aggro', 'Balanced', 'Control', 'Buildup'] as $k): ?><span><?= $emoji[$k] ?> <?= h($k) ?></span><?php endforeach; ?>
        </p>
    </section>

    <div id="dcv-app" class="dcv-app" data-state="<?= h($state) ?>">
        <noscript><p class="ac-notice ac-notice--danger">JavaScript is required to vote.</p></noscript>
    </div>
    <script type="application/json" id="dcv-data"><?= json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>

    <dialog class="ac-dialog dcv-dialog" id="dcv-dialog" aria-labelledby="dcv-dialog-title">
        <div class="ac-dialog__header">
            <h2 class="ac-dialog__title" id="dcv-dialog-title"></h2>
            <button type="button" class="ac-icon-button ac-icon-button--ghost" aria-label="<?= h($txt['close']) ?>" data-dcv-close><?= ac_icon('x') ?></button>
        </div>
        <div class="ac-dialog__body" id="dcv-dialog-body"></div>
    </dialog>
    <?php endif; ?>
</div>
