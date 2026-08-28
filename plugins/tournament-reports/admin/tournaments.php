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
