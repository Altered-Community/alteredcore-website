<?php
// Admin page for managing rankings of a specific tournament.
require_once __DIR__ . '/../inc/functions.php';

$tournamentExtId = trim($_GET['tournament'] ?? '');
if ($tournamentExtId === '') {
    flash('No tournament specified.', 'error');
    redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
}

$tournament = trGetTournamentByExternalId($tournamentExtId);
if (!$tournament) {
    flash('Tournament not found.', 'error');
    redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
}

$players  = trExtractPlayers(json_encode($tournament['games_data']));

// Single ranking per tournament
$ranking  = null;
$existing = trGetRankings($tournamentExtId);
if (!empty($existing)) {
    $ranking = trGetRanking((int)$existing[0]['id']);
}

$backUrl = BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage';
$rankingPageUrl = BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-ranking&tournament=' . urlencode($tournamentExtId);

$txt = [
    'en' => [
        'back'              => '← Back to tournaments',
        'title'             => 'Rankings: %s',
        'create_title'      => 'Create Ranking',
        'create_name_ph'    => 'Ranking name…',
        'create_btn'        => 'Save ranking',
        'create_hint'       => 'Drag rows to reorder players, then save.',
        'players_title'     => 'All players in this tournament',
        'players_empty'     => 'No players found in tournament data.',
        'players_id'        => 'ID',
        'players_name'      => 'Name',
        'players_faction'   => 'Faction',
        'players_games'     => 'Games',
        'edit_title'        => 'Edit Ranking',
        'edit_hint'         => 'Drag rows to reorder players, then save.',
        'ranking_pos'       => 'Pos.',
        'ranking_player'    => 'Player',
        'ranking_save'      => 'Save',
        'ranking_delete'    => 'Delete ranking',
        'ranking_delete_confirm' => 'Delete this ranking?',
        'ranking_no_players'=> 'No players in this ranking.',
        'ranking_add_player'=> 'Add player',
        'saved'             => 'Ranking saved.',
        'deleted'           => 'Ranking deleted.',
        'player_ph'         => 'Select player…',
        'drag_hint'         => 'Drag to reorder',
        'ranking_position'  => 'Position',
    ],
    'fr' => [
        'back'              => '← Retour aux tournois',
        'title'             => 'Classements : %s',
        'create_title'      => 'Créer un classement',
        'create_name_ph'    => 'Nom du classement…',
        'create_btn'        => 'Enregistrer le classement',
        'create_hint'       => 'Glissez les lignes pour réordonner les joueurs, puis enregistrez.',
        'players_title'     => 'Tous les joueurs de ce tournoi',
        'players_empty'     => 'Aucun joueur trouvé dans les données du tournoi.',
        'players_id'        => 'ID',
        'players_name'      => 'Nom',
        'players_faction'   => 'Faction',
        'players_games'     => 'Matchs',
        'edit_title'        => 'Modifier le classement',
        'edit_hint'         => 'Glissez les lignes pour réordonner les joueurs, puis enregistrez.',
        'ranking_pos'       => 'Pos.',
        'ranking_player'    => 'Joueur',
        'ranking_save'      => 'Enregistrer',
        'ranking_delete'    => 'Supprimer le classement',
        'ranking_delete_confirm' => 'Supprimer ce classement ?',
        'ranking_no_players'=> 'Aucun joueur dans ce classement.',
        'ranking_add_player'=> 'Ajouter un joueur',
        'saved'             => 'Classement enregistré.',
        'deleted'           => 'Classement supprimé.',
        'player_ph'         => 'Sélectionner un joueur…',
        'drag_hint'         => 'Glissez pour réordonner',
        'ranking_position'  => 'Position',
    ],
][getUiLang()] ?? [];

// ── Handle POST ────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect($rankingPageUrl);
    }

    // Save ranking (create or update — always one per tournament)
    if (isset($_POST['save_ranking'])) {
        $rankingId   = (int)($_POST['ranking_id'] ?? 0);
        $rankingName = trim($_POST['ranking_name'] ?? '');
        $playersJson = $_POST['ranking_players'] ?? '[]';
        $playersData = json_decode($playersJson, true);
        if (!is_array($playersData)) $playersData = [];

        if ($rankingId) {
            $existingRanking = trGetRanking($rankingId);
            if ($existingRanking) {
                global $db;
                $db->prepare(qp("UPDATE {rankings} SET tournament_name = :tn WHERE id = :id"))
                   ->execute([':tn' => $rankingName, ':id' => $rankingId]);
                trUpdateRankingPlayers($rankingId, $playersData);
            }
        } else {
            $userId = (int)($_SESSION['user_id'] ?? 0);
            $newId  = trCreateRanking($tournamentExtId, $rankingName, $userId);
            trUpdateRankingPlayers($newId, $playersData);
        }
        flash($txt['saved']);
        redirect($rankingPageUrl);
    }

    // Delete ranking
    if (isset($_POST['delete_ranking'])) {
        $rankingId = (int)($_POST['ranking_id'] ?? 0);
        if ($rankingId) {
            trDeleteRanking($rankingId);
            flash($txt['deleted']);
        }
        redirect($rankingPageUrl);
    }
}

$isEditing = ($ranking !== null);
$formTitle = $isEditing ? $txt['edit_title'] : $txt['create_title'];
$formHint  = $isEditing ? $txt['edit_hint']  : $txt['create_hint'];
?>

<div class="d-flex align-items-center mb-4">
    <a href="<?= $backUrl ?>" class="text-decoration-none me-3">
        <i class="fa-solid fa-arrow-left"></i>
    </a>
    <h1 class="mb-0"><i class="fa-solid fa-ranking-star me-2"></i><?= sprintf($txt['title'], h($tournament['tournament_name'] ?: $tournament['tournament_id'])) ?></h1>
</div>

<?php if (empty($players)): ?>
<div class="card-altered p-4 mb-4">
    <p class="text-muted mb-0"><?= $txt['players_empty'] ?></p>
</div>
<?php else: ?>

<!-- ── Ranking form (create or edit) ───────────────────────────────────────── -->
<div class="card-altered p-4 mb-4">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0"><?= h($formTitle) ?></h5>
        <?php if ($isEditing): ?>
        <form method="post" class="d-inline" onsubmit="return confirm('<?= h($txt['ranking_delete_confirm']) ?>')">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="ranking_id" value="<?= $ranking['id'] ?>">
            <button type="submit" name="delete_ranking" class="btn btn-sm btn-outline-danger">
                <i class="fa-solid fa-trash me-1"></i><?= h($txt['ranking_delete']) ?>
            </button>
        </form>
        <?php endif; ?>
    </div>
    <p class="text-muted small mb-3"><?= h($formHint) ?></p>

    <form method="post" id="tr-ranking-form">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="ranking_id" value="<?= $isEditing ? $ranking['id'] : '' ?>">
        <input type="hidden" name="ranking_players" id="tr-ranking-players-json">

        <div class="mb-3">
            <input type="text" name="ranking_name" class="form-control form-control-sm"
                   style="max-width:300px" placeholder="<?= h($txt['create_name_ph']) ?>"
                   value="<?= h($isEditing ? $ranking['tournament_name'] : $tournament['tournament_name']) ?>">
        </div>

        <div class="table-responsive">
            <table class="table table-sm table-altered mb-0">
                <thead>
                    <tr>
                        <th style="width:40px"></th>
                        <th style="width:50px"><?= h($txt['ranking_pos']) ?></th>
                        <?php if ($isEditing): ?>
                        <th><?= h($txt['ranking_player']) ?></th>
                        <?php else: ?>
                        <th><?= h($txt['players_name']) ?></th>
                        <th><?= h($txt['players_faction']) ?></th>
                        <?php endif; ?>
                        <?php if ($isEditing): ?>
                        <th style="width:40px"></th>
                        <?php endif; ?>
                    </tr>
                </thead>
                <tbody id="tr-ranking-body">
                <?php if ($isEditing): ?>
                    <?php foreach ($ranking['players'] as $pi => $p): ?>
                    <tr class="tr-rank-row" draggable="true"
                        data-player-id="<?= h($p['player_id'] ?? '') ?>">
                        <td>
                            <span class="tr-drag-handle" style="cursor:grab;color:var(--neutral-400,#9ca3af);font-size:1.1em" title="<?= h($txt['drag_hint']) ?>">
                                <i class="fa-solid fa-grip-vertical"></i>
                            </span>
                        </td>
                        <td class="tr-pos"><?= $pi + 1 ?></td>
                        <td>
                            <select class="form-select form-select-sm tr-player-select" style="max-width:220px">
                                <option value=""><?= h($txt['player_ph']) ?></option>
                                <?php foreach ($players as $ap): ?>
                                <option value="<?= h($ap['id']) ?>" data-name="<?= h($ap['name']) ?>"
                                        <?= ($ap['id'] ?? '') === ($p['player_id'] ?? '') ? 'selected' : '' ?>>
                                    <?= h($ap['name']) ?> (<?= h($ap['faction']) ?>)
                                </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline-danger tr-remove-row">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <?php foreach ($players as $pi => $p): ?>
                    <tr class="tr-rank-row" draggable="true"
                        data-player-id="<?= h($p['id']) ?>"
                        data-player-name="<?= h($p['name']) ?>"
                        data-faction="<?= h($p['faction']) ?>">
                        <td>
                            <span class="tr-drag-handle" style="cursor:grab;color:var(--neutral-400,#9ca3af);font-size:1.1em" title="<?= h($txt['drag_hint']) ?>">
                                <i class="fa-solid fa-grip-vertical"></i>
                            </span>
                        </td>
                        <td class="tr-pos"><?= $pi + 1 ?></td>
                        <td><strong><?= h($p['name']) ?></strong></td>
                        <td><?= h($p['faction']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            <button type="submit" name="save_ranking" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-check me-1"></i><?= h($txt['create_btn']) ?>
            </button>
        </div>
    </form>
</div>

<?php endif; ?>

<script>
var TR_PLAYERS  = <?= json_encode($players, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_TXT      = <?= json_encode($txt, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_IS_EDIT  = <?= $isEditing ? 'true' : 'false' ?>;
var TR_DRAG_SRC = null;

/* ── Drag & drop for any .tr-rank-row ───────────────────────────────────── */
function initRowDrag(row) {
    row.addEventListener('dragstart', function(e) {
        TR_DRAG_SRC = this;
        this.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });
    row.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('dragenter', function(e) {
        e.preventDefault();
        this.classList.add('tr-drag-over');
    });
    row.addEventListener('dragleave', function() {
        this.classList.remove('tr-drag-over');
    });
    row.addEventListener('drop', function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.classList.remove('tr-drag-over');
        if (TR_DRAG_SRC && TR_DRAG_SRC !== this) {
            var tbody = this.closest('tbody');
            var allRows = Array.from(tbody.querySelectorAll('.tr-rank-row'));
            var fromIdx = allRows.indexOf(TR_DRAG_SRC);
            var toIdx   = allRows.indexOf(this);
            if (fromIdx < toIdx) {
                tbody.insertBefore(TR_DRAG_SRC, this.nextSibling);
            } else {
                tbody.insertBefore(TR_DRAG_SRC, this);
            }
            renumberRows(tbody);
        }
    });
    row.addEventListener('dragend', function() {
        this.style.opacity = '';
        document.querySelectorAll('.tr-drag-over').forEach(function(el) {
            el.classList.remove('tr-drag-over');
        });
        TR_DRAG_SRC = null;
    });
}

function renumberRows(tbody) {
    tbody.querySelectorAll('.tr-rank-row').forEach(function(row, i) {
        var pos = row.querySelector('.tr-pos');
        if (pos) pos.textContent = i + 1;
    });
}

document.querySelectorAll('.tr-rank-row[draggable]').forEach(initRowDrag);

/* ── Form: serialize before submit ─────────────────────────────────────── */
document.getElementById('tr-ranking-form').addEventListener('submit', function() {
    var rows = document.querySelectorAll('#tr-ranking-body .tr-rank-row');
    var players = [];
    rows.forEach(function(row, i) {
        if (TR_IS_EDIT) {
            var sel  = row.querySelector('.tr-player-select');
            var val  = sel ? sel.value : '';
            var name = '';
            if (sel && sel.selectedIndex > 0) {
                name = sel.options[sel.selectedIndex].dataset.name || sel.options[sel.selectedIndex].textContent.trim();
            }
            if (!name) return;
            players.push({
                position:    i + 1,
                player_id:   (val && val !== '_custom') ? val : '',
                player_name: name
            });
        } else {
            var name = row.dataset.playerName || '';
            if (!name) return;
            players.push({
                position:    i + 1,
                player_id:   row.dataset.playerId || '',
                player_name: name
            });
        }
    });
    document.getElementById('tr-ranking-players-json').value = JSON.stringify(players);
});

/* ── Player select → auto-fill name (edit mode) ─────────────────────────── */
document.addEventListener('change', function(e) {
    if (!e.target.classList.contains('tr-player-select')) return;
    var sel  = e.target;
    var row  = sel.closest('.tr-rank-row');
    if (!row) return;
    var val  = sel.value;
    if (val && sel.selectedIndex > 0) {
        row.dataset.playerId   = val;
        row.dataset.playerName = sel.options[sel.selectedIndex].dataset.name || '';
    } else {
        row.dataset.playerId   = '';
        row.dataset.playerName = '';
    }
});

/* ── Remove row ─────────────────────────────────────────────────────────── */
document.addEventListener('click', function(e) {
    var btn = e.target.closest('.tr-remove-row');
    if (!btn) return;
    var row = btn.closest('.tr-rank-row');
    var tbody = row.parentElement;
    row.remove();
    renumberRows(tbody);
});
</script>

<style>
.tr-drag-over > td { border-top: 2px solid var(--primary-400, #C9A84C); }
.tr-rank-row { transition: opacity .15s ease; }
.tr-rank-row[draggable="true"]:active { cursor: grabbing; }
</style>
