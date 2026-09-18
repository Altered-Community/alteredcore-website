<?php
// Admin page for managing tournaments.
require_once __DIR__ . '/../inc/functions.php';

$txt = [
    'en' => [
        'title'         => 'Tournaments',
        'fetch_title'   => 'Fetch Tournament',
        'fetch_label'   => 'Tournament ID',
        'fetch_ph'      => 'Enter tournament ID…',
        'fetch_btn'     => 'Fetch & Store',
        'fetch_help'    => 'Fetches tournament data from the external API and stores it in the database.',
        'fetch_success' => 'Tournament fetched and stored successfully.',
        'fetch_error'   => 'Failed to fetch tournament: %s',
        'not_configured'=> 'Tournament API is not configured. Set it in Tournament Settings.',
        'col_id'        => 'ID',
        'col_tournament'=> 'Tournament',
        'col_games'     => 'Games',
        'col_localization' => 'Localization',
        'col_description'  => 'Description',
        'col_fetched'   => 'Fetched',
        'col_actions'   => 'Actions',
        'view_page'     => 'View on site',
        'rankings'      => 'Rankings',
        'edit_loc'      => 'Edit localization',
        'loc_ph'        => 'e.g. Paris, France',
        'loc_save'      => 'Save',
        'loc_saved'     => 'Localization saved.',
        'edit_desc'     => 'Edit description',
        'desc_ph'       => 'Tournament description…',
        'desc_saved'    => 'Description saved.',
        'delete'        => 'Delete',
        'delete_confirm'=> 'Delete this tournament and all its data?',
        'empty'         => 'No tournaments stored yet. Fetch one above.',
        'create_title'      => 'Create tournament (manual)',
        'create_subtitle'   => 'Add a tournament and its players directly, without fetching from the API.',
        'create_toggle'     => 'Create manually',
        'create_lbl_name'   => 'Tournament name',
        'create_lbl_id'     => 'External ID (optional)',
        'create_id_help'    => 'Used as the page URL key. Leave empty to auto-generate.',
        'create_lbl_format' => 'Format',
        'create_lbl_date'   => 'Date',
        'create_lbl_loc'    => 'Localization',
        'create_lbl_desc'   => 'Description',
        'create_players'    => 'Players',
        'create_add_player' => 'Add player',
        'create_player_name'=> 'Player name',
        'create_player_faction' => 'Faction',
        'create_decklist_ph'=> '1 ALT_CORE_B_LY_03_C',
        'create_decklist'   => 'Decklist — one "qty reference" per line',
        'create_remove_player' => 'Remove player',
        'create_btn'        => 'Create tournament',
        'create_success'    => 'Tournament created successfully.',
        'create_need_player'=> 'Please add at least one player.',
        'create_need_name'  => 'Please enter a tournament name.',
        'create_deck_error' => 'Invalid decklist for player "%s": %s',
        'create_id_exists'  => 'A tournament with this ID already exists.',
    ],
    'fr' => [
        'title'         => 'Tournois',
        'fetch_title'   => 'Récupérer un tournoi',
        'fetch_label'   => 'ID du tournoi',
        'fetch_ph'      => 'Entrez l\'ID du tournoi…',
        'fetch_btn'     => 'Récupérer et enregistrer',
        'fetch_help'    => 'Récupère les données du tournoi depuis l\'API externe et les enregistre en base.',
        'fetch_success' => 'Tournoi récupéré et enregistré avec succès.',
        'fetch_error'   => 'Échec de la récupération du tournoi : %s',
        'not_configured'=> 'L\'API de tournoi n\'est pas configurée. Réglez-la dans les paramètres tournois.',
        'col_id'        => 'ID',
        'col_tournament'=> 'Tournoi',
        'col_games'     => 'Matchs',
        'col_localization' => 'Localisation',
        'col_description'  => 'Description',
        'col_fetched'   => 'Récupéré',
        'col_actions'   => 'Actions',
        'view_page'     => 'Voir sur le site',
        'rankings'      => 'Classements',
        'edit_loc'      => 'Modifier la localisation',
        'loc_ph'        => 'ex. Paris, France',
        'loc_save'      => 'Enregistrer',
        'loc_saved'     => 'Localisation enregistrée.',
        'edit_desc'     => 'Modifier la description',
        'desc_ph'       => 'Description du tournoi…',
        'desc_saved'    => 'Description enregistrée.',
        'delete'        => 'Supprimer',
        'delete_confirm'=> 'Supprimer ce tournoi et toutes ses données ?',
        'empty'         => 'Aucun tournoi enregistré. Récupérez-en un ci-dessus.',
        'create_title'      => 'Créer un tournoi (manuel)',
        'create_subtitle'   => 'Ajoutez un tournoi et ses joueurs directement, sans récupération via l\'API.',
        'create_toggle'     => 'Créer manuellement',
        'create_lbl_name'   => 'Nom du tournoi',
        'create_lbl_id'     => 'ID externe (facultatif)',
        'create_id_help'    => 'Utilisé comme clé d\'URL de la page. Laissez vide pour auto-générer.',
        'create_lbl_format' => 'Format',
        'create_lbl_date'   => 'Date',
        'create_lbl_loc'    => 'Localisation',
        'create_lbl_desc'   => 'Description',
        'create_players'    => 'Joueurs',
        'create_add_player' => 'Ajouter un joueur',
        'create_player_name'=> 'Nom du joueur',
        'create_player_faction' => 'Faction',
        'create_decklist_ph'=> '1 ALT_CORE_B_LY_03_C',
        'create_decklist'   => 'Decklist — une « quantité référence » par ligne',
        'create_remove_player' => 'Supprimer le joueur',
        'create_btn'        => 'Créer le tournoi',
        'create_success'    => 'Tournoi créé avec succès.',
        'create_need_player'=> 'Veuillez ajouter au moins un joueur.',
        'create_need_name'  => 'Veuillez saisir un nom de tournoi.',
        'create_deck_error' => 'Decklist invalide pour le joueur « %s » : %s',
        'create_id_exists'  => 'Un tournoi avec cet ID existe déjà.',
    ],
][getUiLang()] ?? [];

// ── Handle POST actions ──────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
    }

    // Fetch & store tournament
    if (isset($_POST['fetch_tournament'])) {
        $apiUrl = trGetApiUrl();
        if ($apiUrl === '') {
            flash($txt['not_configured'], 'error');
        } else {
            $tournamentId = trim($_POST['tournament_id'] ?? '');
            if ($tournamentId === '') {
                flash('Please enter a tournament ID.', 'error');
            } else {
                $result = trFetchTournament($tournamentId);
                if ($result['ok'] && isset($result['data'])) {
                    $userId = (int)($_SESSION['user_id'] ?? 0);
                    trSaveTournament($result['data'], $userId);
                    flash($txt['fetch_success']);
                } else {
                    flash(sprintf($txt['fetch_error'], $result['error'] ?? 'Unknown error'), 'error');
                }
            }
        }
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
    }

    // Delete tournament
    if (isset($_POST['delete_tournament'])) {
        $id = (int)($_POST['id'] ?? 0);
        if ($id) {
            trDeleteTournament($id);
            flash('Tournament deleted.');
        }
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
    }

    // Save localization
    if (isset($_POST['save_localization'])) {
        $tid   = trim($_POST['tournament_id'] ?? '');
        $loc   = trim($_POST['localization'] ?? '');
        if ($tid !== '') {
            trUpdateTournamentLocalization($tid, $loc);
            flash($txt['loc_saved']);
        }
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
    }

    // Save description
    if (isset($_POST['save_description'])) {
        $tid   = trim($_POST['tournament_id'] ?? '');
        $desc  = trim($_POST['description'] ?? '');
        if ($tid !== '') {
            trUpdateTournamentDescription($tid, $desc);
            flash($txt['desc_saved']);
        }
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
    }

    // Create manual tournament
    if (isset($_POST['create_manual_tournament'])) {
        $name = trim($_POST['tournament_name'] ?? '');
        if ($name === '') {
            flash($txt['create_need_name'], 'error');
            redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
        }

        $playersJson = $_POST['players'] ?? '[]';
        $players     = json_decode($playersJson, true);
        if (!is_array($players)) $players = [];
        $players = array_values(array_filter($players, fn($p) => trim((string)($p['name'] ?? '')) !== ''));

        if (empty($players)) {
            flash($txt['create_need_player'], 'error');
            redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
        }

        // Build players with parsed decks; collect any malformed decklist lines.
        $builtPlayers = [];
        foreach ($players as $p) {
            $playerName = trim((string)($p['name'] ?? ''));
            $deckText   = (string)($p['decklist'] ?? '');
            $parsed     = parseDecklistText($deckText);
            if (!$parsed['ok']) {
                flash(sprintf($txt['create_deck_error'], $playerName, implode('; ', $parsed['errors'])), 'error');
                redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
            }
            $builtPlayers[] = [
                'name'    => $playerName,
                'faction' => trim((string)($p['faction'] ?? '')),
                'deck'    => $parsed['deck'],
            ];
        }

        $userId   = (int)($_SESSION['user_id'] ?? 0);
        $manualId = trim($_POST['tournament_id'] ?? '');

        // Reject duplicate manual id instead of silently overwriting.
        if ($manualId !== '') {
            $exists = $db->prepare(qp("SELECT id FROM {tournaments} WHERE tournament_id = :tid"));
            $exists->execute([':tid' => $manualId]);
            if ($exists->fetchColumn()) {
                flash($txt['create_id_exists'], 'error');
                redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
            }
        }

        trManualSaveTournament([
            'tournament_name' => $name,
            'tournament_id'   => $manualId,
            'format'          => trim($_POST['format'] ?? ''),
            'date'            => trim($_POST['date'] ?? ''),
            'localization'    => trim($_POST['localization'] ?? ''),
            'description'     => trim($_POST['description'] ?? ''),
            'players'         => $builtPlayers,
        ], $userId);

        flash($txt['create_success']);
        redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
    }
}

// ── Fetch list ───────────────────────────────────────────────────────────────
$tournaments = trGetTournaments();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-trophy me-2"></i><?= h($txt['title']) ?></h1>
</div>

<!-- Fetch form -->
<div class="card-altered p-4 mb-4">
    <h5 class="mb-3"><?= h($txt['fetch_title']) ?></h5>
    <form method="post" class="d-flex align-items-end gap-3 flex-wrap">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <div class="flex-grow-1" style="min-width:200px">
            <label class="form-label fw-semibold small"><?= h($txt['fetch_label']) ?></label>
            <input type="text" name="tournament_id" class="form-control"
                   placeholder="<?= h($txt['fetch_ph']) ?>" required>
            <div class="form-text"><?= $txt['fetch_help'] ?></div>
        </div>
        <button type="submit" name="fetch_tournament" class="btn btn-primary-altered">
            <i class="fa-solid fa-download me-1"></i><?= h($txt['fetch_btn']) ?>
        </button>
    </form>
</div>

<!-- Create tournament (manual) -->
<div class="card-altered p-4 mb-4">
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <h5 class="mb-0"><i class="fa-solid fa-plus me-2"></i><?= h($txt['create_title']) ?></h5>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="tr-manual-toggle">
            <i class="fa-solid fa-chevron-down me-1"></i><?= h($txt['create_toggle']) ?>
        </button>
    </div>
    <p class="text-muted small mb-3"><?= h($txt['create_subtitle']) ?></p>

    <form method="post" id="tr-manual-form" style="display:none">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="players" id="tr-manual-players-json">

        <div class="row g-3 mb-3">
            <div class="col-md-4">
                <label class="form-label fw-semibold small"><?= h($txt['create_lbl_name']) ?> *</label>
                <input type="text" name="tournament_name" class="form-control" required value="">
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold small"><?= h($txt['create_lbl_id']) ?></label>
                <input type="text" name="tournament_id" class="form-control" value="">
                <div class="form-text"><?= $txt['create_id_help'] ?></div>
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold small"><?= h($txt['create_lbl_format']) ?></label>
                <input type="text" name="format" class="form-control" value="">
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold small"><?= h($txt['create_lbl_date']) ?></label>
                <input type="datetime-local" name="date" class="form-control" value="">
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold small"><?= h($txt['create_lbl_loc']) ?></label>
                <input type="text" name="localization" class="form-control" value="">
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold small"><?= h($txt['create_lbl_desc']) ?></label>
                <input type="text" name="description" class="form-control" value="">
            </div>
        </div>

        <div class="d-flex align-items-center justify-content-between mb-2">
            <h6 class="mb-0"><?= h($txt['create_players']) ?></h6>
            <button type="button" class="btn btn-sm btn-outline-primary" id="tr-manual-add-player">
                <i class="fa-solid fa-user-plus me-1"></i><?= h($txt['create_add_player']) ?>
            </button>
        </div>

        <div id="tr-manual-players"></div>

        <div class="mt-3">
            <button type="submit" name="create_manual_tournament" class="btn btn-primary-altered">
                <i class="fa-solid fa-check me-1"></i><?= h($txt['create_btn']) ?>
            </button>
        </div>
    </form>
</div>

<!-- Tournament list -->
<div class="card-altered mb-4">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th><?= h($txt['col_id']) ?></th>
                    <th><?= h($txt['col_tournament']) ?></th>
                    <th><?= h($txt['col_games']) ?></th>
                    <th><?= h($txt['col_localization']) ?></th>
                    <th><?= h($txt['col_description']) ?></th>
                    <th><?= h($txt['col_fetched']) ?></th>
                    <th class="text-end"><?= h($txt['col_actions']) ?></th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($tournaments)): ?>
                <tr><td colspan="7" class="text-center text-muted py-4"><?= $txt['empty'] ?></td></tr>
            <?php else: ?>
                <?php foreach ($tournaments as $t): ?>
                <tr>
                    <td><?= $t['id'] ?></td>
                    <td>
                        <strong><?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?></strong>
                        <div class="text-muted small">External ID: <?= h($t['tournament_id']) ?></div>
                    </td>
                    <td><?= $t['total_games'] ?></td>
                    <td style="min-width:220px">
                        <span class="tr-loc-display" id="tr-loc-display-<?= h($t['tournament_id']) ?>"><?= h($t['localization'] ?: '—') ?></span>
                        <form method="post" class="tr-loc-form d-none" id="tr-loc-form-<?= h($t['tournament_id']) ?>">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="tournament_id" value="<?= h($t['tournament_id']) ?>">
                            <div class="input-group input-group-sm">
                                <input type="text" name="localization" class="form-control"
                                       placeholder="<?= h($txt['loc_ph']) ?>"
                                       value="<?= h($t['localization']) ?>" style="max-width:180px">
                                <button type="submit" name="save_localization" class="btn btn-primary-altered btn-sm">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm tr-loc-cancel"
                                        data-tid="<?= h($t['tournament_id']) ?>">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </form>
                    </td>
                    <td style="min-width:220px">
                        <div class="text-muted small">
                            <span class="tr-desc-display" id="tr-desc-display-<?= h($t['tournament_id']) ?>"><?= h($t['description'] ?: '') ?></span>
                            <button type="button" class="btn btn-link btn-sm p-0 tr-desc-edit ms-1"
                                    data-tid="<?= h($t['tournament_id']) ?>"
                                    title="<?= h($txt['edit_desc']) ?>"
                                    style="text-decoration:none;font-size:.85rem">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                        <form method="post" class="tr-desc-form d-none" id="tr-desc-form-<?= h($t['tournament_id']) ?>">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="tournament_id" value="<?= h($t['tournament_id']) ?>">
                            <textarea name="description" class="form-control form-control-sm" rows="2"
                                      placeholder="<?= h($txt['desc_ph']) ?>"
                                      style="width:100%"><?= h($t['description'] ?? '') ?></textarea>
                            <div class="d-flex gap-1 mt-1">
                                <button type="submit" name="save_description" class="btn btn-primary-altered btn-sm">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm tr-desc-cancel"
                                        data-tid="<?= h($t['tournament_id']) ?>">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </form>
                    </td>
                    <td class="text-muted small"><?= h($t['fetched_at']) ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <button type="button" class="btn btn-sm btn-outline-secondary tr-loc-edit"
                                data-tid="<?= h($t['tournament_id']) ?>"
                                title="<?= h($txt['edit_loc']) ?>">
                            <i class="fa-solid fa-location-dot"></i>
                        </button>
                        <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                           class="btn btn-sm btn-outline-primary" target="_blank"
                           title="<?= h($txt['view_page']) ?>">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                        <a href="<?= BASE_URL ?>/admin/plugin-page?plugin=tournament-reports&section=tournament-ranking&tournament=<?= h(urlencode($t['tournament_id'])) ?>"
                           class="btn btn-sm btn-outline-secondary"
                           title="<?= h($txt['rankings']) ?>">
                            <i class="fa-solid fa-ranking-star"></i>
                        </a>
                        <?php if (adminCanDelete()): ?>
                        <form method="post" class="d-inline" onsubmit="return confirm('<?= h($txt['delete_confirm']) ?>')">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $t['id'] ?>">
                            <button type="submit" name="delete_tournament" class="btn btn-sm btn-outline-danger"
                                    title="<?= h($txt['delete']) ?>">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<script>
document.addEventListener('click', function(e) {
    var editBtn = e.target.closest('.tr-loc-edit');
    if (editBtn) {
        var tid = editBtn.dataset.tid;
        document.getElementById('tr-loc-display-' + tid).classList.add('d-none');
        document.getElementById('tr-loc-form-' + tid).classList.remove('d-none');
        document.getElementById('tr-loc-form-' + tid).querySelector('input[name="localization"]').focus();
        return;
    }
    var cancelBtn = e.target.closest('.tr-loc-cancel');
    if (cancelBtn) {
        var tid = cancelBtn.dataset.tid;
        document.getElementById('tr-loc-display-' + tid).classList.remove('d-none');
        document.getElementById('tr-loc-form-' + tid).classList.add('d-none');
        return;
    }
    var descEditBtn = e.target.closest('.tr-desc-edit');
    if (descEditBtn) {
        var tid = descEditBtn.dataset.tid;
        document.getElementById('tr-desc-display-' + tid).classList.add('d-none');
        document.getElementById('tr-desc-form-' + tid).classList.remove('d-none');
        document.getElementById('tr-desc-form-' + tid).querySelector('textarea[name="description"]').focus();
        return;
    }
    var descCancelBtn = e.target.closest('.tr-desc-cancel');
    if (descCancelBtn) {
        var tid = descCancelBtn.dataset.tid;
        document.getElementById('tr-desc-display-' + tid).classList.remove('d-none');
        document.getElementById('tr-desc-form-' + tid).classList.add('d-none');
    }
});
</script>

<script>
(function () {
    var TXT = <?= json_encode([
        'pname_label'  => $txt['create_player_name'],
        'pname_ph'     => 'e.g. Alice',
        'pfaction_label'=> $txt['create_player_faction'],
        'pfaction_ph'  => 'e.g. LY',
        'remove_title' => $txt['create_remove_player'],
        'deck_label'   => $txt['create_decklist'],
        'deck_ph'      => $txt['create_decklist_ph'],
    ], JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;

    var form      = document.getElementById('tr-manual-form');
    var container = document.getElementById('tr-manual-players');
    var addBtn    = document.getElementById('tr-manual-add-player');
    var toggleBtn = document.getElementById('tr-manual-toggle');
    var playersJson = document.getElementById('tr-manual-players-json');
    var playerSeq = 0;

    function playerRow() {
        var seq = playerSeq++;
        var div = document.createElement('div');
        div.className = 'tr-manual-player border rounded p-3 mb-3';
        div.dataset.seq = seq;
        div.innerHTML =
            '<div class="row g-2 mb-2 align-items-end">' +
                '<div class="col-md-4">' +
                    '<label class="form-label fw-semibold small">' + TXT.pname_label + '</label>' +
                    '<input type="text" class="form-control tr-manual-pname" placeholder="' + TXT.pname_ph + '">' +
                '</div>' +
                '<div class="col-md-3">' +
                    '<label class="form-label fw-semibold small">' + TXT.pfaction_label + '</label>' +
                    '<input type="text" class="form-control tr-manual-pfaction" placeholder="' + TXT.pfaction_ph + '">' +
                '</div>' +
                '<div class="col-md-3"></div>' +
                '<div class="col-md-2 text-end">' +
                    '<button type="button" class="btn btn-sm btn-outline-danger tr-manual-remove" title="' + TXT.remove_title + '">' +
                        '<i class="fa-solid fa-xmark"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div class="row g-2">' +
                '<div class="col-12">' +
                    '<label class="form-label fw-semibold small">' + TXT.deck_label + '</label>' +
                    '<textarea class="form-control tr-manual-decklist font-monospace" rows="6" placeholder="' + TXT.deck_ph + '"></textarea>' +
                '</div>' +
            '</div>';
        return div;
    }

    addBtn.addEventListener('click', function () {
        container.appendChild(playerRow());
    });

    container.addEventListener('click', function (e) {
        var btn = e.target.closest('.tr-manual-remove');
        if (btn) btn.closest('.tr-manual-player').remove();
    });

    toggleBtn.addEventListener('click', function () {
        var hidden = form.style.display === 'none';
        form.style.display = hidden ? '' : 'none';
        toggleBtn.querySelector('i').className = 'fa-solid me-1 ' + (hidden ? 'fa-chevron-up' : 'fa-chevron-down');
    });

    form.addEventListener('submit', function () {
        var players = [];
        container.querySelectorAll('.tr-manual-player').forEach(function (row) {
            var name = row.querySelector('.tr-manual-pname').value.trim();
            if (!name) return;
            players.push({
                name:     name,
                faction:  row.querySelector('.tr-manual-pfaction').value.trim(),
                decklist: row.querySelector('.tr-manual-decklist').value
            });
        });
        playersJson.value = JSON.stringify(players);
    });
})();
</script>
