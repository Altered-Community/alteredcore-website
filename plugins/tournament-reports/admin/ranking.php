<?php
// Admin page: a tournament's players, standings (wins/games/losses desc — the
// only ranking now, see inc/functions.php), and, for GameApi tournaments, the
// "correct a result" action (GameApi's adjustment endpoint). Manual
// tournaments have no bga_user_id/adjustment concept, so they're read-only
// here.
require_once __DIR__ . '/../inc/functions.php';

$tournamentExtId = trim($_GET['tournament'] ?? '');
if ($tournamentExtId === '') {
    flash('No tournament specified.', 'error');
    redirect(BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage');
}

$backUrl = BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-manage';
$selfUrl = BASE_URL . '/admin/plugin-page?plugin=tournament-reports&section=tournament-ranking&tournament=' . urlencode($tournamentExtId);

$txt = [
    'en' => [
        'back'              => '← Back to tournaments',
        'title'             => 'Players: %s',
        'players_empty'     => 'No players found for this tournament.',
        'players_name'      => 'Player',
        'players_hero'      => 'Hero',
        'players_games'     => 'Games',
        'wl_header'         => 'W-L',
        'correct'           => 'Correct',
        'correct_title'     => 'Correct this player\'s result',
        'wins_adj_label'    => 'Wins adjustment',
        'losses_adj_label'  => 'Losses adjustment',
        'note_label'        => 'Note (required)',
        'note_ph'           => 'Reason for this correction…',
        'save'              => 'Save',
        'cancel'            => 'Cancel',
        'saved'             => 'Correction saved.',
        'note_required'     => 'A note is required.',
        'existing_note'     => 'Current correction: %+d/%+d — %s',
        'manual_note'       => 'This is a manual tournament — results are entered directly and cannot be corrected here.',
        'live_error'        => 'Could not load this tournament from GameApi: %s',
    ],
    'fr' => [
        'back'              => '← Retour aux tournois',
        'title'             => 'Joueurs : %s',
        'players_empty'     => 'Aucun joueur trouvé pour ce tournoi.',
        'players_name'      => 'Joueur',
        'players_hero'      => 'Héros',
        'players_games'     => 'Matchs',
        'wl_header'         => 'V-D',
        'correct'           => 'Corriger',
        'correct_title'     => 'Corriger le résultat de ce joueur',
        'wins_adj_label'    => 'Ajustement victoires',
        'losses_adj_label'  => 'Ajustement défaites',
        'note_label'        => 'Note (obligatoire)',
        'note_ph'           => 'Raison de cette correction…',
        'save'              => 'Enregistrer',
        'cancel'            => 'Annuler',
        'saved'             => 'Correction enregistrée.',
        'note_required'     => 'Une note est obligatoire.',
        'existing_note'     => 'Correction actuelle : %+d/%+d — %s',
        'manual_note'       => 'Ce tournoi est manuel — les résultats sont saisis directement et ne peuvent pas être corrigés ici.',
        'live_error'        => 'Impossible de charger ce tournoi depuis GameApi : %s',
    ],
][getUiLang()] ?? [];

// ── Handle POST ──────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect($selfUrl);
    }

    if (isset($_POST['save_adjustment'])) {
        $bgaUserId = trim($_POST['bga_user_id'] ?? '');
        $winsAdj   = (int)($_POST['wins_adjustment'] ?? 0);
        $lossesAdj = (int)($_POST['losses_adjustment'] ?? 0);
        $note      = trim($_POST['adjustment_note'] ?? '');

        if ($note === '') {
            flash($txt['note_required'], 'error');
            redirect($selfUrl);
        }

        $result = trSubmitAdjustment($tournamentExtId, $bgaUserId, $winsAdj, $lossesAdj, $note);
        flash($result['ok'] ? $txt['saved'] : ($result['error'] ?? 'Error'), $result['ok'] ? 'success' : 'error');
        redirect($selfUrl);
    }
}

// ── Load standings ───────────────────────────────────────────────────────────
$local = trGetTournamentByExternalId($tournamentExtId);
$isManual = trIsManualTournament($local);

if ($isManual) {
    $tournamentName = $local['tournament_name'] ?: $tournamentExtId;
    $standings = trComputeManualStandings($local['games_data']);
} else {
    $userId = (int)($_SESSION['user_id'] ?? 0);
    $live = trFetchLiveTournament($tournamentExtId, $userId);
    if (!$live['ok']) {
        flash(sprintf($txt['live_error'], $live['error'] ?? 'Unknown error'), 'error');
        redirect($backUrl);
    }
    $tournamentName = $live['tournament_name'] ?: $tournamentExtId;
    $standings = $live['standings'];
}
?>

<div class="d-flex align-items-center mb-4">
    <a href="<?= $backUrl ?>" class="text-decoration-none me-3">
        <i class="fa-solid fa-arrow-left"></i>
    </a>
    <h1 class="mb-0"><i class="fa-solid fa-ranking-star me-2"></i><?= sprintf($txt['title'], h($tournamentName)) ?></h1>
</div>

<?php if ($isManual): ?>
<div class="alert alert-info"><?= h($txt['manual_note']) ?></div>
<?php endif; ?>

<div class="card-altered p-4 mb-4">
    <?php if (empty($standings)): ?>
    <p class="text-muted mb-0"><?= h($txt['players_empty']) ?></p>
    <?php else: ?>
    <div class="table-responsive">
        <table class="table table-sm table-altered mb-0">
            <thead>
                <tr>
                    <th><?= h($txt['players_name']) ?></th>
                    <th><?= h($txt['players_hero']) ?></th>
                    <th style="width:64px" class="text-center"><?= h($txt['wl_header']) ?></th>
                    <th style="width:64px" class="text-center"><?= h($txt['players_games']) ?></th>
                    <?php if (!$isManual): ?>
                    <th style="width:120px"></th>
                    <?php endif; ?>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($standings as $p): ?>
                <tr>
                    <td><strong><?= h($p['name']) ?></strong></td>
                    <td><?= h($p['hero'] ?? $p['faction'] ?? '') ?></td>
                    <td class="text-center"><?= h($p['wins']) ?>-<?= h($p['losses']) ?></td>
                    <td class="text-center"><?= h($p['games_played']) ?></td>
                    <?php if (!$isManual): ?>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-secondary tr-correct-toggle" data-pid="<?= h($p['id']) ?>">
                            <i class="fa-solid fa-pen"></i> <?= h($txt['correct']) ?>
                        </button>
                    </td>
                    <?php endif; ?>
                </tr>
                <?php if (!$isManual): ?>
                <tr class="tr-correct-row d-none" id="tr-correct-row-<?= h($p['id']) ?>">
                    <td colspan="5">
                        <?php if (!empty($p['admin_adjustment_note'])): ?>
                        <div class="text-muted small mb-2">
                            <?= h(sprintf($txt['existing_note'], (int)$p['admin_wins_adjustment'], (int)$p['admin_losses_adjustment'], $p['admin_adjustment_note'])) ?>
                        </div>
                        <?php endif; ?>
                        <form method="post" class="row g-2 align-items-end">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="bga_user_id" value="<?= h($p['id']) ?>">
                            <div class="col-md-2">
                                <label class="form-label small fw-semibold"><?= h($txt['wins_adj_label']) ?></label>
                                <input type="number" name="wins_adjustment" class="form-control form-control-sm"
                                       value="<?= (int)$p['admin_wins_adjustment'] ?>">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-semibold"><?= h($txt['losses_adj_label']) ?></label>
                                <input type="number" name="losses_adjustment" class="form-control form-control-sm"
                                       value="<?= (int)$p['admin_losses_adjustment'] ?>">
                            </div>
                            <div class="col-md-5">
                                <label class="form-label small fw-semibold"><?= h($txt['note_label']) ?></label>
                                <input type="text" name="adjustment_note" class="form-control form-control-sm"
                                       placeholder="<?= h($txt['note_ph']) ?>" required
                                       value="<?= h($p['admin_adjustment_note'] ?? '') ?>">
                            </div>
                            <div class="col-md-3 d-flex gap-2">
                                <button type="submit" name="save_adjustment" class="btn btn-sm btn-primary-altered">
                                    <?= h($txt['save']) ?>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-secondary tr-correct-cancel" data-pid="<?= h($p['id']) ?>">
                                    <?= h($txt['cancel']) ?>
                                </button>
                            </div>
                        </form>
                    </td>
                </tr>
                <?php endif; ?>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<script>
document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.tr-correct-toggle');
    if (toggle) {
        document.getElementById('tr-correct-row-' + toggle.dataset.pid).classList.toggle('d-none');
        return;
    }
    var cancel = e.target.closest('.tr-correct-cancel');
    if (cancel) {
        document.getElementById('tr-correct-row-' + cancel.dataset.pid).classList.add('d-none');
    }
});
</script>
