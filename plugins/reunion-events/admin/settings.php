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
        'frontier_section'       => 'Frontier seasons',
        'frontier_help'          => 'Define Frontier pool seasons with a start date, end date, and color. They appear as range bars on the Events calendar.',
        'frontier_empty'         => 'No Frontier seasons yet.',
        'frontier_col_name'      => 'Name',
        'frontier_col_start'     => 'Start',
        'frontier_col_end'       => 'End',
        'frontier_col_color'     => 'Color',
        'frontier_col_actions'   => 'Actions',
        'frontier_label_name'    => 'Season name',
        'frontier_label_start'   => 'Start date',
        'frontier_label_end'     => 'End date',
        'frontier_label_color'   => 'Color',
        'frontier_btn_add'       => 'Add season',
        'frontier_btn_update'    => 'Update season',
        'frontier_btn_edit'      => 'Edit',
        'frontier_btn_delete'    => 'Delete',
        'frontier_btn_cancel'    => 'Cancel edit',
        'frontier_saved'         => 'Frontier season saved.',
        'frontier_deleted'       => 'Frontier season deleted.',
        'frontier_invalid'       => 'Invalid season — check name, dates (start ≤ end), and color (#RRGGBB).',
        'frontier_not_found'     => 'Season not found.',
        'frontier_save_fail'     => 'Could not save Frontier seasons.',
        'frontier_delete_confirm'=> 'Delete this Frontier season?',
        'logos_section'          => 'Event logos',
        'logos_help'             => 'Upload a logo for Frontier, or for a specific event series. Matching is case-insensitive: the event name and/or series must contain the text you set.',
        'logos_frontier'         => 'Frontier logo',
        'logos_frontier_help'    => 'Shown in the calendar legend and day detail. PNG with transparency works best.',
        'logos_btn_upload'       => 'Upload logo',
        'logos_btn_restore'      => 'Remove logo',
        'logos_restore_confirm'  => 'Remove the Frontier logo?',
        'logos_current'          => 'Current logo',
        'logos_frontier_none'    => 'No Frontier logo yet.',
        'logos_none'             => 'No event logos yet. Add one below.',
        'logos_col_logo'         => 'Logo',
        'logos_col_name'         => 'Name',
        'logos_col_match'        => 'Matches',
        'logos_col_source'       => 'Source',
        'logos_col_actions'      => 'Actions',
        'logos_label_name'       => 'Label',
        'logos_label_match_name' => 'Event name contains',
        'logos_label_match_series'=> 'Series contains',
        'logos_label_source'     => 'Apply to',
        'logos_source_all'       => 'All events',
        'logos_source_bga'       => 'Online only',
        'logos_source_physical'  => 'Physical only',
        'logos_label_weekday'    => 'Also show on every same weekday of the month',
        'logos_label_file'       => 'Logo file',
        'logos_file_help'        => 'PNG, JPG, WebP or GIF. Leave empty when editing to keep the current file.',
        'logos_btn_add'          => 'Add event logo',
        'logos_btn_update'       => 'Update event logo',
        'logos_btn_edit'         => 'Edit',
        'logos_btn_delete'       => 'Delete',
        'logos_btn_cancel'       => 'Cancel edit',
        'logos_saved'            => 'Event logo saved.',
        'logos_deleted'          => 'Event logo deleted.',
        'logos_restored'         => 'Frontier logo removed.',
        'logos_invalid'          => 'Invalid logo — set a name and at least one match (event name, series, or weekday rule).',
        'logos_not_found'        => 'Logo not found.',
        'logos_save_fail'        => 'Could not save the logo.',
        'logos_empty_file'       => 'Choose an image file to upload.',
        'logos_invalid_image'    => 'Unsupported or invalid image file.',
        'logos_delete_confirm'   => 'Delete this event logo?',
        'logos_match_name'       => 'name',
        'logos_match_series'     => 'series',
        'logos_match_weekday'    => 'every same weekday',
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
        'frontier_section'       => 'Saisons Frontier',
        'frontier_help'          => 'Définissez les saisons / pools Frontier avec une date de début, une date de fin et une couleur. Elles apparaissent en bandes sur le calendrier des événements.',
        'frontier_empty'         => 'Aucune saison Frontier pour le moment.',
        'frontier_col_name'      => 'Nom',
        'frontier_col_start'     => 'Début',
        'frontier_col_end'       => 'Fin',
        'frontier_col_color'     => 'Couleur',
        'frontier_col_actions'   => 'Actions',
        'frontier_label_name'    => 'Nom de la saison',
        'frontier_label_start'   => 'Date de début',
        'frontier_label_end'     => 'Date de fin',
        'frontier_label_color'   => 'Couleur',
        'frontier_btn_add'       => 'Ajouter la saison',
        'frontier_btn_update'    => 'Mettre à jour',
        'frontier_btn_edit'      => 'Modifier',
        'frontier_btn_delete'    => 'Supprimer',
        'frontier_btn_cancel'    => 'Annuler la modification',
        'frontier_saved'         => 'Saison Frontier enregistrée.',
        'frontier_deleted'       => 'Saison Frontier supprimée.',
        'frontier_invalid'       => 'Saison invalide — vérifiez le nom, les dates (début ≤ fin) et la couleur (#RRGGBB).',
        'frontier_not_found'     => 'Saison introuvable.',
        'frontier_save_fail'     => 'Impossible d\'enregistrer les saisons Frontier.',
        'frontier_delete_confirm'=> 'Supprimer cette saison Frontier ?',
        'logos_section'          => 'Logos d\'événements',
        'logos_help'             => 'Importez un logo pour Frontier, ou pour une série d\'événements. La correspondance ignore la casse : le nom et/ou la série de l\'événement doivent contenir le texte indiqué.',
        'logos_frontier'         => 'Logo Frontier',
        'logos_frontier_help'    => 'Affiché dans la légende du calendrier et le détail du jour. Un PNG transparent est recommandé.',
        'logos_btn_upload'       => 'Importer le logo',
        'logos_btn_restore'      => 'Supprimer le logo',
        'logos_restore_confirm'  => 'Supprimer le logo Frontier ?',
        'logos_current'          => 'Logo actuel',
        'logos_frontier_none'    => 'Aucun logo Frontier pour le moment.',
        'logos_none'             => 'Aucun logo d\'événement pour le moment. Ajoutez-en un ci-dessous.',
        'logos_col_logo'         => 'Logo',
        'logos_col_name'         => 'Nom',
        'logos_col_match'        => 'Correspondance',
        'logos_col_source'       => 'Source',
        'logos_col_actions'      => 'Actions',
        'logos_label_name'       => 'Libellé',
        'logos_label_match_name' => 'Le nom de l\'événement contient',
        'logos_label_match_series'=> 'La série contient',
        'logos_label_source'     => 'Appliquer à',
        'logos_source_all'       => 'Tous les événements',
        'logos_source_bga'       => 'En ligne uniquement',
        'logos_source_physical'  => 'Physique uniquement',
        'logos_label_weekday'    => 'Afficher aussi chaque même jour de la semaine du mois',
        'logos_label_file'       => 'Fichier logo',
        'logos_file_help'        => 'PNG, JPG, WebP ou GIF. Laissez vide en modification pour conserver le fichier actuel.',
        'logos_btn_add'          => 'Ajouter un logo',
        'logos_btn_update'       => 'Mettre à jour le logo',
        'logos_btn_edit'         => 'Modifier',
        'logos_btn_delete'       => 'Supprimer',
        'logos_btn_cancel'       => 'Annuler la modification',
        'logos_saved'            => 'Logo d\'événement enregistré.',
        'logos_deleted'          => 'Logo d\'événement supprimé.',
        'logos_restored'         => 'Logo Frontier supprimé.',
        'logos_invalid'          => 'Logo invalide — indiquez un nom et au moins une correspondance (nom, série, ou règle du jour de la semaine).',
        'logos_not_found'        => 'Logo introuvable.',
        'logos_save_fail'        => 'Impossible d\'enregistrer le logo.',
        'logos_empty_file'       => 'Choisissez un fichier image à importer.',
        'logos_invalid_image'    => 'Fichier image invalide ou non pris en charge.',
        'logos_delete_confirm'   => 'Supprimer ce logo d\'événement ?',
        'logos_match_name'       => 'nom',
        'logos_match_series'     => 'série',
        'logos_match_weekday'    => 'chaque même jour de la semaine',
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

$logoErrors = [
    'invalid'        => $txt['logos_invalid'] ?? 'Invalid logo.',
    'not_found'      => $txt['logos_not_found'] ?? 'Logo not found.',
    'save_fail'      => $txt['logos_save_fail'] ?? 'Could not save.',
    'empty_file'     => $txt['logos_empty_file'] ?? 'Choose a file.',
    'invalid_image'  => $txt['logos_invalid_image'] ?? 'Invalid image.',
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
    } elseif ($action === 'save_frontier_season') {
        $result = reUpsertFrontierSeason([
            'id'         => $_POST['frontier_id'] ?? '',
            'name'       => $_POST['frontier_name'] ?? '',
            'start_date' => $_POST['frontier_start'] ?? '',
            'end_date'   => $_POST['frontier_end'] ?? '',
            'color'      => $_POST['frontier_color'] ?? '',
        ]);
        if (!empty($result['ok'])) {
            flash($txt['frontier_saved'], 'success');
        } elseif (($result['error'] ?? '') === 'invalid') {
            flash($txt['frontier_invalid'], 'error');
        } else {
            flash($txt['frontier_save_fail'], 'error');
        }
    } elseif ($action === 'delete_frontier_season') {
        $result = reDeleteFrontierSeason((string)($_POST['frontier_id'] ?? ''));
        if (!empty($result['ok'])) {
            flash($txt['frontier_deleted'], 'success');
        } elseif (($result['error'] ?? '') === 'not_found') {
            flash($txt['frontier_not_found'], 'error');
        } else {
            flash($txt['frontier_save_fail'], 'error');
        }
    } elseif ($action === 'upload_frontier_logo') {
        $result = reSaveFrontierLogo($_FILES['frontier_logo'] ?? null);
        if (!empty($result['ok'])) {
            flash($txt['logos_saved'], 'success');
        } else {
            $err = $result['error'] ?? '';
            flash($logoErrors[$err] ?? ($txt['logos_save_fail'] ?? 'Error'), 'error');
        }
    } elseif ($action === 'restore_frontier_logo') {
        reRestoreFrontierLogo();
        flash($txt['logos_restored'], 'success');
    } elseif ($action === 'save_event_brand') {
        $result = reUpsertEventBrand([
            'id'                => $_POST['brand_id'] ?? '',
            'name'              => $_POST['brand_name'] ?? '',
            'match_name'        => $_POST['brand_match_name'] ?? '',
            'match_series'      => $_POST['brand_match_series'] ?? '',
            'source'            => $_POST['brand_source'] ?? 'all',
            'show_every_weekday' => !empty($_POST['brand_show_weekday']),
        ], $_FILES['brand_logo'] ?? null);
        if (!empty($result['ok'])) {
            flash($txt['logos_saved'], 'success');
        } else {
            $err = $result['error'] ?? '';
            flash($logoErrors[$err] ?? ($txt['logos_save_fail'] ?? 'Error'), 'error');
        }
    } elseif ($action === 'delete_event_brand') {
        $result = reDeleteEventBrand((string)($_POST['brand_id'] ?? ''));
        if (!empty($result['ok'])) {
            flash($txt['logos_deleted'], 'success');
        } else {
            $err = $result['error'] ?? '';
            flash($logoErrors[$err] ?? ($txt['logos_save_fail'] ?? 'Error'), 'error');
        }
    }

    redirect($settingsUrl);
}

$apiKey   = reGetSetting('api_key', '');
$bgaCache = reLoadBgaTournamentsJson();
$bgaUploadedAt = reGetSetting('bga_json_uploaded_at', '');
$bgaFormatOptions = reCollectBgaAdminTournamentFormatOptions();
$bgaDeckOptions   = reCollectBgaAdminDeckFormatOptions();
$frontierSeasons  = reLoadFrontierSeasons();
$editFrontierId   = trim((string)($_GET['edit_frontier'] ?? ''));
$editFrontier     = null;
if ($editFrontierId !== '') {
    foreach ($frontierSeasons as $s) {
        if ($s['id'] === $editFrontierId) {
            $editFrontier = $s;
            break;
        }
    }
}
$eventBrands   = reLoadEventBrands();
$editBrandId   = trim((string)($_GET['edit_brand'] ?? ''));
$editBrand     = null;
if ($editBrandId !== '') {
    foreach ($eventBrands as $b) {
        if ($b['id'] === $editBrandId) {
            $editBrand = $b;
            break;
        }
    }
}
$frontierLogoUrl = reFrontierLogoUrl();
$frontierLogoCustom = reGetSetting('frontier_logo_file', '') !== '';
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

<div class="card-altered p-4 mb-4" style="max-width:720px">
    <h5 class="mb-3">
        <i class="fa-solid fa-layer-group me-2"></i>
        <?= h($txt['frontier_section']) ?>
    </h5>
    <p class="text-muted small"><?= h($txt['frontier_help']) ?></p>

    <?php if ($frontierSeasons === []): ?>
    <p class="text-muted mb-4"><?= h($txt['frontier_empty']) ?></p>
    <?php else: ?>
    <div class="table-responsive mb-4">
        <table class="table table-sm align-middle mb-0">
            <thead>
                <tr>
                    <th><?= h($txt['frontier_col_name']) ?></th>
                    <th><?= h($txt['frontier_col_start']) ?></th>
                    <th><?= h($txt['frontier_col_end']) ?></th>
                    <th><?= h($txt['frontier_col_color']) ?></th>
                    <th><?= h($txt['frontier_col_actions']) ?></th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($frontierSeasons as $season): ?>
                <tr>
                    <td><?= h($season['name']) ?></td>
                    <td><?= h($season['start_date']) ?></td>
                    <td><?= h($season['end_date']) ?></td>
                    <td>
                        <span class="d-inline-flex align-items-center gap-2">
                            <span style="display:inline-block;width:1.1rem;height:1.1rem;border-radius:0.25rem;background:<?= h($season['color']) ?>;border:1px solid rgba(0,0,0,.2)"></span>
                            <code class="small"><?= h($season['color']) ?></code>
                        </span>
                    </td>
                    <td class="text-nowrap">
                        <a href="<?= h($settingsUrl . '&edit_frontier=' . urlencode($season['id'])) ?>"
                           class="btn btn-sm btn-outline-secondary">
                            <?= h($txt['frontier_btn_edit']) ?>
                        </a>
                        <form method="post" class="d-inline" onsubmit="return confirm(<?= json_encode($txt['frontier_delete_confirm'], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>);">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="delete_frontier_season">
                            <input type="hidden" name="frontier_id" value="<?= h($season['id']) ?>">
                            <button type="submit" class="btn btn-sm btn-outline-danger">
                                <?= h($txt['frontier_btn_delete']) ?>
                            </button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>

    <hr class="my-4">

    <h5 class="mb-3">
        <i class="fa-solid fa-<?= $editFrontier ? 'pen' : 'plus' ?> me-2"></i>
        <?= h($editFrontier ? $txt['frontier_btn_update'] : $txt['frontier_btn_add']) ?>
    </h5>

    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_frontier_season">
        <?php if ($editFrontier): ?>
        <input type="hidden" name="frontier_id" value="<?= h($editFrontier['id']) ?>">
        <?php endif; ?>

        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="frontier_name"><?= h($txt['frontier_label_name']) ?> *</label>
                <input type="text" class="form-control" id="frontier_name" name="frontier_name" required
                       value="<?= h($editFrontier['name'] ?? '') ?>"
                       placeholder="Season 3">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-semibold" for="frontier_start"><?= h($txt['frontier_label_start']) ?> *</label>
                <input type="date" class="form-control" id="frontier_start" name="frontier_start" required
                       value="<?= h($editFrontier['start_date'] ?? '') ?>">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-semibold" for="frontier_end"><?= h($txt['frontier_label_end']) ?> *</label>
                <input type="date" class="form-control" id="frontier_end" name="frontier_end" required
                       value="<?= h($editFrontier['end_date'] ?? '') ?>">
            </div>
            <div class="col-md-4">
                <label class="form-label small fw-semibold" for="frontier_color"><?= h($txt['frontier_label_color']) ?></label>
                <?php $frontierColorVal = $editFrontier['color'] ?? RE_FRONTIER_DEFAULT_COLOR; ?>
                <div class="input-group">
                    <input type="color" class="form-control form-control-color" id="frontier_color_picker"
                           value="<?= h($frontierColorVal) ?>"
                           title="<?= h($txt['frontier_label_color']) ?>"
                           style="max-width:3.5rem">
                    <input type="text" class="form-control font-monospace" id="frontier_color" name="frontier_color"
                           pattern="#[0-9A-Fa-f]{6}" maxlength="7" required
                           value="<?= h($frontierColorVal) ?>">
                </div>
            </div>
            <div class="col-12 d-flex flex-wrap gap-2">
                <button type="submit" class="btn btn-sm btn-primary-altered">
                    <i class="fa-solid fa-floppy-disk me-1"></i>
                    <?= h($editFrontier ? $txt['frontier_btn_update'] : $txt['frontier_btn_add']) ?>
                </button>
                <?php if ($editFrontier): ?>
                <a href="<?= h($settingsUrl) ?>" class="btn btn-sm btn-outline-secondary">
                    <?= h($txt['frontier_btn_cancel']) ?>
                </a>
                <?php endif; ?>
            </div>
        </div>
    </form>
</div>

<div class="card-altered p-4 mb-4" style="max-width:720px">
    <h5 class="mb-3">
        <i class="fa-solid fa-image me-2"></i>
        <?= h($txt['logos_section']) ?>
    </h5>
    <p class="text-muted small"><?= h($txt['logos_help']) ?></p>

    <h6 class="mb-2"><?= h($txt['logos_frontier']) ?></h6>
    <p class="text-muted small"><?= h($txt['logos_frontier_help']) ?></p>
    <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
        <?php if ($frontierLogoUrl !== ''): ?>
        <img src="<?= h($frontierLogoUrl) ?>"
             alt="Frontier"
             width="56"
             height="56"
             style="width:4.5rem;height:4.5rem;object-fit:contain;border-radius:0.35rem;background:transparent">
        <span class="badge text-bg-secondary"><?= h($txt['logos_current']) ?></span>
        <?php else: ?>
        <span class="text-muted small"><?= h($txt['logos_frontier_none']) ?></span>
        <?php endif; ?>
    </div>
    <div class="d-flex flex-wrap gap-2 align-items-end mb-4">
        <form method="post" enctype="multipart/form-data" class="d-flex flex-wrap gap-2 align-items-end flex-grow-1">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <div class="flex-grow-1" style="min-width:200px">
                <input type="file" name="frontier_logo" class="form-control form-control-sm" accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif" required>
            </div>
            <button type="submit" name="action" value="upload_frontier_logo" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-upload me-1"></i>
                <?= h($txt['logos_btn_upload']) ?>
            </button>
        </form>
        <?php if ($frontierLogoCustom): ?>
        <form method="post" onsubmit="return confirm(<?= json_encode($txt['logos_restore_confirm'], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>);">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <button type="submit" name="action" value="restore_frontier_logo" class="btn btn-sm btn-outline-danger">
                <?= h($txt['logos_btn_restore']) ?>
            </button>
        </form>
        <?php endif; ?>
    </div>

    <hr class="my-4">

    <?php if ($eventBrands === []): ?>
    <p class="text-muted mb-4"><?= h($txt['logos_none']) ?></p>
    <?php else: ?>
    <div class="table-responsive mb-4">
        <table class="table table-sm align-middle mb-0">
            <thead>
                <tr>
                    <th><?= h($txt['logos_col_logo']) ?></th>
                    <th><?= h($txt['logos_col_name']) ?></th>
                    <th><?= h($txt['logos_col_match']) ?></th>
                    <th><?= h($txt['logos_col_source']) ?></th>
                    <th><?= h($txt['logos_col_actions']) ?></th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($eventBrands as $brand): ?>
                <?php
                    $matchBits = [];
                    if ($brand['match_name'] !== '') {
                        $matchBits[] = $txt['logos_match_name'] . ': ' . $brand['match_name'];
                    }
                    if ($brand['match_series'] !== '') {
                        $matchBits[] = $txt['logos_match_series'] . ': ' . $brand['match_series'];
                    }
                    if (!empty($brand['show_every_weekday'])) {
                        $matchBits[] = $txt['logos_match_weekday'];
                    }
                    $sourceLabel = $txt['logos_source_all'];
                    if ($brand['source'] === 'bga') {
                        $sourceLabel = $txt['logos_source_bga'];
                    } elseif ($brand['source'] === 'physical') {
                        $sourceLabel = $txt['logos_source_physical'];
                    }
                ?>
                <tr>
                    <td>
                        <?php if ($brand['logo_url'] !== ''): ?>
                        <img src="<?= h($brand['logo_url']) ?>"
                             alt="<?= h($brand['name']) ?>"
                             width="44"
                             height="44"
                             style="width:2.75rem;height:2.75rem;object-fit:contain;border-radius:0.45rem;border:2px solid rgba(0,0,0,.2);background:#070b12">
                        <?php endif; ?>
                    </td>
                    <td><?= h($brand['name']) ?></td>
                    <td class="small"><?= h(implode(' · ', $matchBits)) ?></td>
                    <td class="small"><?= h($sourceLabel) ?></td>
                    <td class="text-nowrap">
                        <a href="<?= h($settingsUrl . '&edit_brand=' . urlencode($brand['id'])) ?>"
                           class="btn btn-sm btn-outline-secondary">
                            <?= h($txt['logos_btn_edit']) ?>
                        </a>
                        <form method="post" class="d-inline" onsubmit="return confirm(<?= json_encode($txt['logos_delete_confirm'], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>);">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="delete_event_brand">
                            <input type="hidden" name="brand_id" value="<?= h($brand['id']) ?>">
                            <button type="submit" class="btn btn-sm btn-outline-danger">
                                <?= h($txt['logos_btn_delete']) ?>
                            </button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>

    <h5 class="mb-3">
        <i class="fa-solid fa-<?= $editBrand ? 'pen' : 'plus' ?> me-2"></i>
        <?= h($editBrand ? $txt['logos_btn_update'] : $txt['logos_btn_add']) ?>
    </h5>

    <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_event_brand">
        <?php if ($editBrand): ?>
        <input type="hidden" name="brand_id" value="<?= h($editBrand['id']) ?>">
        <?php endif; ?>

        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="brand_name"><?= h($txt['logos_label_name']) ?> *</label>
                <input type="text" class="form-control" id="brand_name" name="brand_name" required maxlength="120"
                       value="<?= h($editBrand['name'] ?? '') ?>"
                       placeholder="Monday Night TOPCUT">
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="brand_source"><?= h($txt['logos_label_source']) ?></label>
                <select class="form-select" id="brand_source" name="brand_source">
                    <?php $brandSource = $editBrand['source'] ?? 'all'; ?>
                    <option value="all"<?= $brandSource === 'all' ? ' selected' : '' ?>><?= h($txt['logos_source_all']) ?></option>
                    <option value="bga"<?= $brandSource === 'bga' ? ' selected' : '' ?>><?= h($txt['logos_source_bga']) ?></option>
                    <option value="physical"<?= $brandSource === 'physical' ? ' selected' : '' ?>><?= h($txt['logos_source_physical']) ?></option>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="brand_match_name"><?= h($txt['logos_label_match_name']) ?></label>
                <input type="text" class="form-control" id="brand_match_name" name="brand_match_name" maxlength="120"
                       value="<?= h($editBrand['match_name'] ?? '') ?>"
                       placeholder="monday night topcut">
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-semibold" for="brand_match_series"><?= h($txt['logos_label_match_series']) ?></label>
                <input type="text" class="form-control" id="brand_match_series" name="brand_match_series" maxlength="120"
                       value="<?= h($editBrand['match_series'] ?? '') ?>"
                       placeholder="official altered reunion">
            </div>
            <div class="col-12">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="brand_show_weekday" name="brand_show_weekday" value="1"
                           <?= !empty($editBrand['show_every_weekday']) ? 'checked' : '' ?>>
                    <label class="form-check-label" for="brand_show_weekday"><?= h($txt['logos_label_weekday']) ?></label>
                </div>
            </div>
            <div class="col-12">
                <label class="form-label small fw-semibold" for="brand_logo"><?= h($txt['logos_label_file']) ?><?= $editBrand ? '' : ' *' ?></label>
                <input type="file" class="form-control" id="brand_logo" name="brand_logo"
                       accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                       <?= $editBrand ? '' : 'required' ?>>
                <div class="form-text"><?= h($txt['logos_file_help']) ?></div>
            </div>
            <div class="col-12 d-flex flex-wrap gap-2">
                <button type="submit" class="btn btn-sm btn-primary-altered">
                    <i class="fa-solid fa-floppy-disk me-1"></i>
                    <?= h($editBrand ? $txt['logos_btn_update'] : $txt['logos_btn_add']) ?>
                </button>
                <?php if ($editBrand): ?>
                <a href="<?= h($settingsUrl) ?>" class="btn btn-sm btn-outline-secondary">
                    <?= h($txt['logos_btn_cancel']) ?>
                </a>
                <?php endif; ?>
            </div>
        </div>
    </form>
</div>
<script>
(function () {
    var picker = document.getElementById('frontier_color_picker');
    var hex = document.getElementById('frontier_color');
    if (!picker || !hex) return;
    picker.addEventListener('input', function () { hex.value = picker.value; });
    hex.addEventListener('input', function () {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value;
    });
})();
</script>
