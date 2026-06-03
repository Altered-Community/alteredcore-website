<?php
require_once __DIR__ . '/../inc/functions.php';

$lang = getUiLang();

$txt = [
    'en' => [
        'title'              => 'Events — Settings',
        'api_section'        => 'API Configuration',
        'label_api_key'      => 'API Key',
        'placeholder'        => 'att_xxxxxxxxxxxxxxxxxxxxxxxx',
        'help_api_key'       => 'Enter your Altered Tournament Tools API key. You can get one from your profile on altered-tournament-tools.com.',
        'btn_save'           => 'Save',
        'btn_test'           => 'Test Connection',
        'flash_saved'        => 'Settings saved.',
        'test_success'       => 'API connection successful!',
        'test_failed'        => 'API connection failed. Please check your API key.',
        'test_no_key'        => 'Please enter an API key first.',
        'bga_section'        => 'BGA tournaments (JSON)',
        'bga_help'           => 'Upload bga-tournaments.json, add tournaments one by one, or download the current file. See plugins/reunion-events/data/README.md for the full JSON format.',
        'bga_data_date'      => 'Data from',
        'bga_current'        => 'Current file',
        'bga_none'           => 'No file uploaded yet.',
        'bga_count'          => 'tournament(s)',
        'bga_uploaded'       => 'Last upload',
        'bga_btn_upload'     => 'Upload JSON',
        'bga_btn_download'   => 'Download JSON',
        'bga_upload_ok'      => 'BGA JSON saved (%d tournaments).',
        'bga_upload_fail'    => 'Could not save BGA JSON.',
        'bga_upload_invalid' => 'Invalid JSON file.',
        'bga_upload_empty'   => 'No file selected.',
        'bga_add_section'    => 'Add one tournament',
        'bga_add_help'       => 'Required: BGA tournament ID, name, start date/time (Europe/Paris), URL, tournament format, deck format, game mode, and pace. Undo is optional.',
        'bga_label_id'       => 'BGA tournament ID',
        'bga_label_name'     => 'Name',
        'bga_label_series'   => 'Series / championship',
        'bga_label_start'    => 'Start date',
        'bga_label_time'     => 'Start time',
        'bga_label_format'   => 'Tournament format',
        'bga_label_deck'     => 'Deck format',
        'bga_label_pace'     => 'Pace',
        'bga_label_game_mode'=> 'Game mode',
        'bga_label_allow_undo'=> 'Allow undo',
        'bga_allow_undo_none'=> '— Not set —',
        'bga_allow_undo_true'=> 'TRUE',
        'bga_allow_undo_false'=> 'FALSE',
        'bga_deck_choose'    => 'Choose…',
        'bga_format_choose'  => 'Choose…',
        'bga_pace_choose'    => 'Choose…',
        'bga_format_empty'   => 'Import a JSON file first — tournament format options come from values already in that file.',
        'bga_add_invalid_format' => 'Invalid tournament format — choose a value from the current JSON.',
        'bga_add_invalid_pace'   => 'Invalid pace — choose Turn-Based or Real-Time.',
        'bga_label_max'      => 'Max players',
        'bga_label_url'      => 'URL',
        'bga_btn_add'        => 'Add tournament',
        'bga_add_ok'         => 'Tournament added (%d total).',
        'bga_add_fail'       => 'Could not add tournament.',
        'bga_add_dup'        => 'A tournament with this ID already exists.',
        'bga_add_invalid_id' => 'Invalid ID — use digits only (BGA tournament id).',
        'bga_add_missing_name'=> 'Name is required.',
        'bga_add_invalid_date'=> 'Invalid start date.',
        'bga_add_invalid_time'=> 'Invalid start time (use HH:MM).',
        'bga_add_missing_url' => 'URL is required.',
        'bga_add_invalid_url' => 'URL must start with http:// or https://',
        'bga_add_missing_format' => 'Tournament format is required.',
        'bga_add_missing_deck'   => 'Deck format is required.',
        'bga_add_missing_pace'   => 'Pace is required.',
        'bga_add_missing_game_mode' => 'Game mode is required.',
        'bga_add_invalid_deck'      => 'Invalid deck format.',
        'bga_add_invalid_allow_undo'=> 'Allow undo must be TRUE or FALSE.',
    ],
    'fr' => [
        'title'              => 'Événements — Paramètres',
        'api_section'        => 'Configuration API',
        'label_api_key'      => 'Clé API',
        'placeholder'        => 'att_xxxxxxxxxxxxxxxxxxxxxxxx',
        'help_api_key'       => 'Entrez votre clé API Altered Tournament Tools. Vous pouvez en obtenir une depuis votre profil sur altered-tournament-tools.com.',
        'btn_save'           => 'Enregistrer',
        'btn_test'           => 'Tester la connexion',
        'flash_saved'        => 'Paramètres enregistrés.',
        'test_success'       => 'Connexion API réussie !',
        'test_failed'        => 'Connexion API échouée. Veuillez vérifier votre clé API.',
        'test_no_key'        => 'Veuillez d\'abord entrer une clé API.',
        'bga_section'        => 'Tournois BGA (JSON)',
        'bga_help'           => 'Importez bga-tournaments.json, ajoutez des tournois un par un ou téléchargez le fichier actuel. Voir plugins/reunion-events/data/README.md pour le format JSON.',
        'bga_data_date'      => 'Données du',
        'bga_current'        => 'Fichier actuel',
        'bga_none'           => 'Aucun fichier importé.',
        'bga_count'          => 'tournoi(s)',
        'bga_uploaded'       => 'Dernier import',
        'bga_btn_upload'     => 'Importer le JSON',
        'bga_btn_download'   => 'Télécharger le JSON',
        'bga_upload_ok'      => 'JSON BGA enregistré (%d tournois).',
        'bga_upload_fail'    => 'Impossible d\'enregistrer le JSON BGA.',
        'bga_upload_invalid' => 'Fichier JSON invalide.',
        'bga_upload_empty'   => 'Aucun fichier sélectionné.',
        'bga_add_section'    => 'Ajouter un tournoi',
        'bga_add_help'       => 'Obligatoire : ID tournoi BGA, nom, date/heure de début (Europe/Paris), URL, format de tournoi, format de deck, mode de jeu et rythme. Annulation optionnelle.',
        'bga_label_id'       => 'ID tournoi BGA',
        'bga_label_name'     => 'Nom',
        'bga_label_series'   => 'Série / championnat',
        'bga_label_start'    => 'Date de début',
        'bga_label_time'     => 'Heure de début',
        'bga_label_format'   => 'Format de tournoi',
        'bga_label_deck'     => 'Format de deck',
        'bga_label_pace'     => 'Rythme',
        'bga_label_game_mode'=> 'Mode de jeu',
        'bga_label_allow_undo'=> 'Annulation autorisée',
        'bga_allow_undo_none'=> '— Non renseigné —',
        'bga_allow_undo_true'=> 'TRUE',
        'bga_allow_undo_false'=> 'FALSE',
        'bga_deck_choose'    => 'Choisir…',
        'bga_format_choose'  => 'Choisir…',
        'bga_pace_choose'    => 'Choisir…',
        'bga_format_empty'   => 'Importez d\'abord un fichier JSON — les formats de tournoi proviennent des valeurs déjà présentes dans ce fichier.',
        'bga_add_invalid_format' => 'Format de tournoi invalide — choisissez une valeur du JSON actuel.',
        'bga_add_invalid_pace'   => 'Rythme invalide — choisissez Turn-Based ou Real-Time.',
        'bga_label_max'      => 'Joueurs max',
        'bga_label_url'      => 'URL',
        'bga_btn_add'        => 'Ajouter le tournoi',
        'bga_add_ok'         => 'Tournoi ajouté (%d au total).',
        'bga_add_fail'       => 'Impossible d\'ajouter le tournoi.',
        'bga_add_dup'        => 'Un tournoi avec cet ID existe déjà.',
        'bga_add_invalid_id' => 'ID invalide — chiffres uniquement (id BGA).',
        'bga_add_missing_name'=> 'Le nom est obligatoire.',
        'bga_add_invalid_date'=> 'Date de début invalide.',
        'bga_add_invalid_time'=> 'Heure invalide (format HH:MM).',
        'bga_add_missing_url' => 'L\'URL est obligatoire.',
        'bga_add_invalid_url' => 'L\'URL doit commencer par http:// ou https://',
        'bga_add_missing_format' => 'Le format de tournoi est obligatoire.',
        'bga_add_missing_deck'   => 'Le format de deck est obligatoire.',
        'bga_add_missing_pace'   => 'Le rythme est obligatoire.',
        'bga_add_missing_game_mode' => 'Le mode de jeu est obligatoire.',
        'bga_add_invalid_deck'      => 'Format de deck invalide.',
        'bga_add_invalid_allow_undo'=> 'Annulation : TRUE ou FALSE uniquement.',
    ],
][$lang] ?? [];

$bgaAddErrors = [
    'duplicate_id'   => $txt['bga_add_dup'] ?? 'Duplicate ID.',
    'invalid_id'     => $txt['bga_add_invalid_id'] ?? 'Invalid ID.',
    'missing_name'   => $txt['bga_add_missing_name'] ?? 'Name required.',
    'invalid_date'   => $txt['bga_add_invalid_date'] ?? 'Invalid date.',
    'invalid_time'   => $txt['bga_add_invalid_time'] ?? 'Invalid time.',
    'missing_url'    => $txt['bga_add_missing_url'] ?? 'URL required.',
    'invalid_url'    => $txt['bga_add_invalid_url'] ?? 'Invalid URL.',
    'missing_format' => $txt['bga_add_missing_format'] ?? 'Format required.',
    'missing_deck'   => $txt['bga_add_missing_deck'] ?? 'Deck format required.',
    'missing_pace'   => $txt['bga_add_missing_pace'] ?? 'Pace required.',
    'missing_game_mode' => $txt['bga_add_missing_game_mode'] ?? 'Game mode required.',
    'invalid_deck'      => $txt['bga_add_invalid_deck'] ?? 'Invalid deck format.',
    'invalid_format'    => $txt['bga_add_invalid_format'] ?? 'Invalid tournament format.',
    'invalid_pace'      => $txt['bga_add_invalid_pace'] ?? 'Invalid pace.',
    'invalid_allow_undo'=> $txt['bga_add_invalid_allow_undo'] ?? 'Invalid allow undo.',
];

$settingsUrl = BASE_URL . '/admin/plugin-page?plugin=reunion-events&section=events-settings';
$downloadUrl = BASE_URL . '/pages/re-bga-json-download?csrf_token=' . urlencode(csrfToken());

// POST handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect($settingsUrl);
    }

    $action = $_POST['action'] ?? 'save';

    if ($action === 'save') {
        $apiKey = trim($_POST['api_key'] ?? '');
        reSaveSetting('api_key', $apiKey);
        flash($txt['flash_saved']);
    } elseif ($action === 'test') {
        $apiKey = trim($_POST['api_key'] ?? '');
        if (empty($apiKey)) {
            flash($txt['test_no_key'], 'warning');
        } else {
            reSaveSetting('api_key', $apiKey);
            $test = reApiRequest('tournaments/upcoming', ['limit' => 1]);
            if ($test !== null) {
                flash($txt['test_success'], 'success');
            } else {
                flash($txt['test_failed'], 'error');
            }
        }
    } elseif ($action === 'upload_bga') {
        if (empty($_FILES['bga_json']['tmp_name'])) {
            flash($txt['bga_upload_empty'], 'warning');
        } else {
            $raw = file_get_contents($_FILES['bga_json']['tmp_name']);
            $result = reSaveBgaTournamentsJsonFile($raw !== false ? $raw : '');
            if (!empty($result['ok'])) {
                flash(sprintf($txt['bga_upload_ok'], (int)($result['count'] ?? 0)), 'success');
            } elseif (($result['error'] ?? '') === 'invalid_json') {
                flash($txt['bga_upload_invalid'], 'error');
            } else {
                flash($txt['bga_upload_fail'], 'error');
            }
        }
    } elseif ($action === 'add_bga') {
        $result = reAddBgaTournamentFromAdmin([
            'id'                 => $_POST['bga_id'] ?? '',
            'name'               => $_POST['bga_name'] ?? '',
            'series'             => $_POST['bga_series'] ?? '',
            'start_date'         => $_POST['bga_start_date'] ?? '',
            'start_time'         => $_POST['bga_start_time'] ?? '',
            'tournament_format'  => $_POST['bga_tournament_format'] ?? '',
            'deck_format'        => $_POST['bga_deck_format'] ?? '',
            'game_mode'          => $_POST['bga_game_mode'] ?? '',
            'game_pace'          => $_POST['bga_game_pace'] ?? '',
            'allow_undo'         => $_POST['bga_allow_undo'] ?? '',
            'players_max'        => $_POST['bga_players_max'] ?? '',
            'url'                => $_POST['bga_url'] ?? '',
        ]);
        if (!empty($result['ok'])) {
            flash(sprintf($txt['bga_add_ok'], (int)($result['count'] ?? 0)), 'success');
        } else {
            $err = $result['error'] ?? '';
            flash($bgaAddErrors[$err] ?? ($txt['bga_add_fail'] ?? 'Error'), 'error');
        }
    }

    redirect($settingsUrl);
}

$apiKey   = reGetSetting('api_key', '');
$bgaCache = reLoadBgaTournamentsJson();
$bgaUploadedAt = reGetSetting('bga_json_uploaded_at', '');
$bgaFormatOptions = reCollectBgaAdminTournamentFormatOptions();
$bgaDeckOptions   = reCollectBgaAdminDeckFormatOptions();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-gear me-2"></i><?= h($txt['title']) ?></h1>
</div>

<div class="card-altered p-4 mb-4" style="max-width:560px">
    <h5 class="mb-3">
        <i class="fa-solid fa-plug me-2"></i>
        <?= h($txt['api_section']) ?>
    </h5>

    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="mb-3">
            <label class="form-label fw-semibold"><?= h($txt['label_api_key']) ?></label>
            <input type="text"
                   name="api_key"
                   class="form-control font-monospace"
                   value="<?= h($apiKey) ?>"
                   placeholder="<?= h($txt['placeholder']) ?>"
                   autocomplete="off">
            <div class="form-text"><?= h($txt['help_api_key']) ?></div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" name="action" value="save" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i>
                <?= h($txt['btn_save']) ?>
            </button>
            <button type="submit" name="action" value="test" class="btn btn-sm btn-outline-secondary">
                <i class="fa-solid fa-plug-circle-check me-1"></i>
                <?= h($txt['btn_test']) ?>
            </button>
        </div>
    </form>
</div>

<div class="card-altered p-4 mb-4" style="max-width:720px">
    <h5 class="mb-3">
        <i class="fa-solid fa-cloud-arrow-up me-2"></i>
        <?= h($txt['bga_section']) ?>
    </h5>
    <p class="text-muted small"><?= h($txt['bga_help']) ?></p>

    <p class="mb-3">
        <strong><?= h($txt['bga_current']) ?>:</strong>
        <?php if ($bgaCache['count'] > 0): ?>
            <?= h($bgaCache['count']) ?> <?= h($txt['bga_count']) ?>
            <?php if (!empty($bgaCache['exported_at'])): ?>
                <span class="text-muted">(<?= h($txt['bga_data_date']) ?> <?= h($bgaCache['exported_at']) ?>)</span>
            <?php endif; ?>
            <?php if ($bgaUploadedAt !== ''): ?>
                <br><span class="small text-muted"><?= h($txt['bga_uploaded']) ?>: <?= h($bgaUploadedAt) ?> UTC</span>
            <?php endif; ?>
        <?php else: ?>
            <span class="text-muted"><?= h($txt['bga_none']) ?></span>
        <?php endif; ?>
    </p>

    <div class="d-flex flex-wrap gap-2 mb-4">
        <form method="post" enctype="multipart/form-data" class="d-flex flex-wrap gap-2 align-items-end flex-grow-1">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <div class="flex-grow-1" style="min-width:200px">
                <input type="file"
                       name="bga_json"
                       class="form-control form-control-sm"
                       accept=".json,application/json">
            </div>
            <button type="submit" name="action" value="upload_bga" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-upload me-1"></i>
                <?= h($txt['bga_btn_upload']) ?>
            </button>
        </form>
        <a href="<?= h($downloadUrl) ?>" class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-download me-1"></i>
            <?= h($txt['bga_btn_download']) ?>
        </a>
    </div>

    <hr class="my-4">

    <h5 class="mb-2">
        <i class="fa-solid fa-plus me-2"></i>
        <?= h($txt['bga_add_section']) ?>
    </h5>
    <p class="text-muted small mb-3"><?= h($txt['bga_add_help']) ?></p>

    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="add_bga">

        <div class="row g-3">
            <div class="col-md-4">
                <label class="form-label small fw-semibold" for="bga_id"><?= h($txt['bga_label_id']) ?> *</label>
                <input type="text" class="form-control" id="bga_id" name="bga_id" required
                       pattern="\d+" inputmode="numeric" placeholder="566604">
            </div>
            <div class="col-md-8">
                <label class="form-label small fw-semibold" for="bga_name"><?= h($txt['bga_label_name']) ?> *</label>
                <input type="text" class="form-control" id="bga_name" name="bga_name" required>
            </div>
            <div class="col-12">
                <label class="form-label small fw-semibold" for="bga_series"><?= h($txt['bga_label_series']) ?></label>
                <input type="text" class="form-control" id="bga_series" name="bga_series">
            </div>
            <div class="col-md-4">
                <label class="form-label small fw-semibold" for="bga_start_date"><?= h($txt['bga_label_start']) ?> *</label>
                <input type="date" class="form-control" id="bga_start_date" name="bga_start_date" required>
            </div>
            <div class="col-md-4">
                <label class="form-label small fw-semibold" for="bga_start_time"><?= h($txt['bga_label_time']) ?> *</label>
                <input type="time" class="form-control" id="bga_start_time" name="bga_start_time" value="20:00" required>
            </div>
            <div class="col-md-4">
                <label class="form-label small fw-semibold" for="bga_players_max"><?= h($txt['bga_label_max']) ?></label>
                <input type="number" class="form-control" id="bga_players_max" name="bga_players_max" min="1" step="1">
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="bga_tournament_format"><?= h($txt['bga_label_format']) ?> *</label>
                <select class="form-select" id="bga_tournament_format" name="bga_tournament_format" required
                        <?= $bgaFormatOptions === [] ? 'disabled' : '' ?>>
                    <option value=""><?= h($txt['bga_format_choose']) ?></option>
                    <?php foreach ($bgaFormatOptions as $formatOpt): ?>
                    <option value="<?= h($formatOpt) ?>"><?= h($formatOpt) ?></option>
                    <?php endforeach; ?>
                </select>
                <?php if ($bgaFormatOptions === []): ?>
                <div class="form-text"><?= h($txt['bga_format_empty']) ?></div>
                <?php endif; ?>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="bga_deck_format"><?= h($txt['bga_label_deck']) ?> *</label>
                <select class="form-select" id="bga_deck_format" name="bga_deck_format" required>
                    <option value=""><?= h($txt['bga_deck_choose']) ?></option>
                    <?php foreach ($bgaDeckOptions as $deckOpt): ?>
                    <option value="<?= h($deckOpt) ?>"><?= h($deckOpt) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="bga_game_mode"><?= h($txt['bga_label_game_mode']) ?> *</label>
                <input type="text" class="form-control" id="bga_game_mode" name="bga_game_mode" required
                       placeholder="Normal - Custom Decks &amp; Starter Decks">
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="bga_game_pace"><?= h($txt['bga_label_pace']) ?> *</label>
                <select class="form-select" id="bga_game_pace" name="bga_game_pace" required>
                    <option value=""><?= h($txt['bga_pace_choose']) ?></option>
                    <?php foreach (RE_BGA_ADMIN_PACE_OPTIONS as $paceOpt): ?>
                    <option value="<?= h($paceOpt) ?>"><?= h($paceOpt) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="bga_allow_undo"><?= h($txt['bga_label_allow_undo']) ?></label>
                <select class="form-select" id="bga_allow_undo" name="bga_allow_undo">
                    <option value=""><?= h($txt['bga_allow_undo_none']) ?></option>
                    <option value="1"><?= h($txt['bga_allow_undo_true']) ?></option>
                    <option value="0"><?= h($txt['bga_allow_undo_false']) ?></option>
                </select>
            </div>
            <div class="col-12">
                <label class="form-label small fw-semibold" for="bga_url"><?= h($txt['bga_label_url']) ?> *</label>
                <input type="url" class="form-control" id="bga_url" name="bga_url" required
                       placeholder="https://boardgamearena.com/tournament?id=566604">
            </div>
            <div class="col-12">
                <button type="submit" class="btn btn-sm btn-primary-altered">
                    <i class="fa-solid fa-plus me-1"></i>
                    <?= h($txt['bga_btn_add']) ?>
                </button>
            </div>
        </div>
    </form>
</div>
