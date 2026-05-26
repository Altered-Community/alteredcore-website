<?php
// ============================================================
// AlteredCore – Template de composants
// Sert de référence visuelle pour tous les éléments UI du site.
// ============================================================
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// translations
$txt = [
    'en' => [
        'page_title'       => 'Component Reference',
        'page_desc'        => 'Visual reference of all reusable UI components on this site.',
        'intro_title'      => 'Introduction',
        'intro_text'       => 'This page lists all the reusable components available on the site. Use it as a reference when building new pages.',
        'alerts_title'     => 'Alerts',
        'buttons_title'    => 'Buttons',
        'modal_title'      => 'Modal',
        'modal_open'       => 'Open modal',
        'modal_heading'    => 'Example modal',
        'modal_body'       => 'This is the body of the modal window. You can place any content here.',
        'modal_cancel'     => 'Cancel',
        'modal_confirm'    => 'Confirm',
        'form_title'       => 'Form',
        'form_name'        => 'Name',
        'form_email'       => 'Email address',
        'form_select'      => 'Choose an option',
        'form_opt_1'       => 'Option 1',
        'form_opt_2'       => 'Option 2',
        'form_opt_3'       => 'Option 3',
        'form_message'     => 'Message',
        'form_check'       => 'I agree to the terms',
        'form_switch'      => 'Enable this option',
        'form_radio_1'     => 'Choice A',
        'form_radio_2'     => 'Choice B',
        'form_submit'      => 'Submit',
        'cards_title'      => 'News cards',
        'card_read_more'   => 'Read more',
        'card_cat_1'       => 'News',
        'card_cat_2'       => 'Update',
        'card_cat_3'       => 'Event',
        'card_title_1'     => 'First example card',
        'card_title_2'     => 'Second card with image',
        'card_title_3'     => 'Third card without excerpt',
        'card_excerpt'     => 'A short excerpt describing the content of this card.',
        'filter_all'       => 'All',
        'pagination_title' => 'Pagination',
        'badges_title'     => 'Badges & Filters',
        'profile_title'    => 'Profile block',
        'profile_type'     => 'Account type',
        'profile_since'    => 'Member since',
        'detail_title'     => 'Article detail layout',
        'detail_back'      => '← Back',
        'detail_pub'       => 'Published on',
        'detail_content'   => 'Article body text goes here. Supports <strong>HTML</strong> and <a href="#">links</a>.',
        'misc_title'       => 'Miscellaneous',
        'coming_soon_lbl'  => 'Coming soon',
        'login_title'      => 'Sign in options',
        'login_sign_in'    => 'Sign in',
        'login_sign_in_desc' => 'Already have an account? Sign in.',
        'login_register'     => 'Create an account',
        'login_register_desc' => 'New here? Join for free.',
        'tabs_title'         => 'Tabs',
        'tab_1_label'        => 'First tab',
        'tab_2_label'        => 'Second tab',
        'tab_3_label'        => 'With icon',
        'tab_1_content'      => 'Content of the first tab. Any HTML can go here.',
        'tab_2_content'      => 'Content of the second tab.',
        'tab_3_content'      => 'Content of the third tab — this one has an icon in its label. The fourth tab above is disabled.',
    ],
    'fr' => [
        'page_title'       => 'Référence de composants',
        'page_desc'        => 'Référence visuelle de tous les composants UI réutilisables du site.',
        'intro_title'      => 'Introduction',
        'intro_text'       => 'Cette page recense tous les composants réutilisables disponibles sur le site. Utilisez-la comme référence lors de la création de nouvelles pages.',
        'alerts_title'     => 'Alertes',
        'buttons_title'    => 'Boutons',
        'modal_title'      => 'Modal',
        'modal_open'       => 'Ouvrir le modal',
        'modal_heading'    => 'Exemple de modal',
        'modal_body'       => 'Ceci est le contenu de la fenêtre modale. Vous pouvez y placer n\'importe quel contenu.',
        'modal_cancel'     => 'Annuler',
        'modal_confirm'    => 'Confirmer',
        'form_title'       => 'Formulaire',
        'form_name'        => 'Nom',
        'form_email'       => 'Adresse email',
        'form_select'      => 'Choisissez une option',
        'form_opt_1'       => 'Option 1',
        'form_opt_2'       => 'Option 2',
        'form_opt_3'       => 'Option 3',
        'form_message'     => 'Message',
        'form_check'       => 'J\'accepte les conditions',
        'form_switch'      => 'Activer cette option',
        'form_radio_1'     => 'Choix A',
        'form_radio_2'     => 'Choix B',
        'form_submit'      => 'Envoyer',
        'cards_title'      => 'Cartes news',
        'card_read_more'   => 'Lire la suite',
        'card_cat_1'       => 'Actualité',
        'card_cat_2'       => 'Mise à jour',
        'card_cat_3'       => 'Événement',
        'card_title_1'     => 'Première carte exemple',
        'card_title_2'     => 'Deuxième carte avec image',
        'card_title_3'     => 'Troisième carte sans extrait',
        'card_excerpt'     => 'Un court extrait décrivant le contenu de cette carte.',
        'filter_all'       => 'Tout',
        'pagination_title' => 'Pagination',
        'badges_title'     => 'Badges & Filtres',
        'profile_title'    => 'Bloc profil',
        'profile_type'     => 'Type de compte',
        'profile_since'    => 'Membre depuis',
        'detail_title'     => 'Mise en page article',
        'detail_back'      => '← Retour',
        'detail_pub'       => 'Publié le',
        'detail_content'   => 'Le corps de l\'article s\'affiche ici. Supporte le <strong>HTML</strong> et les <a href="#">liens</a>.',
        'misc_title'       => 'Divers',
        'coming_soon_lbl'  => 'Bientôt disponible',
        'login_title'      => 'Options de connexion',
        'login_sign_in'    => 'Connexion',
        'login_sign_in_desc' => 'Vous avez déjà un compte ? Connectez-vous.',
        'login_register'     => 'Créer un compte',
        'login_register_desc' => 'Nouveau ici ? Rejoignez-nous gratuitement.',
        'tabs_title'         => 'Onglets',
        'tab_1_label'        => 'Premier onglet',
        'tab_2_label'        => 'Deuxième onglet',
        'tab_3_label'        => 'Avec icône',
        'tab_1_content'      => 'Contenu du premier onglet. N\'importe quel HTML peut y être placé.',
        'tab_2_content'      => 'Contenu du deuxième onglet.',
        'tab_3_content'      => 'Contenu du troisième onglet — celui-ci a une icône dans son label. Le quatrième onglet ci-dessus est désactivé.',
    ],
][getUiLang()] ?? [];

// page meta
$pageTitle       = $txt['page_title'];
$pageDescription = $txt['page_desc'];
// $pageImage    = BASE_URL . '/assets/og-image.jpg';
// $pageBodyBg   = '#1a1a2e';
// $pageForceTheme = 'dark'; // ou 'light'

// État de connexion (disponible partout) :
// $isLoggedIn = kcIsLoggedIn();
// $kcUser     = $isLoggedIn ? kcUser() : [];

include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4">


<div class="section-title mb-2"><span><?= h($txt['page_title']) ?></span></div>
<p class="text-muted mb-5"><?= h($txt['page_desc']) ?></p>


<div class="section-title mb-3"><span><?= h($txt['intro_title']) ?></span></div>
<div class="card-altered p-4 mb-5">
    <div class="d-flex align-items-start gap-3">
        <div style="font-size:2rem;color:var(--primary-400);flex-shrink:0">
            <i class="fa-solid fa-circle-info"></i>
        </div>
        <div>
            <div style="font-weight:700;font-size:1.05rem;margin-bottom:.35rem"><?= h($txt['intro_title']) ?></div>
            <p class="mb-0" style="color:var(--neutral-600)"><?= h($txt['intro_text']) ?></p>
        </div>
    </div>
</div>


<div class="section-title mb-3"><span><?= h($txt['alerts_title']) ?></span></div>
<div class="d-flex flex-column gap-2 mb-5">
    <div class="alert alert-success mb-0">
        <i class="fa-solid fa-circle-check me-2"></i> Success — operation completed.
    </div>
    <div class="alert alert-danger mb-0">
        <i class="fa-solid fa-triangle-exclamation me-2"></i> Danger — something went wrong.
    </div>
    <div class="alert alert-warning mb-0">
        <i class="fa-solid fa-exclamation-circle me-2"></i> Warning — please pay attention.
    </div>
    <div class="alert alert-info mb-0">
        <i class="fa-solid fa-circle-info me-2"></i> Info — just a note.
    </div>
    <!-- Alerte compacte avec bouton retry (pattern deckbuilder) -->
    <div class="alert alert-danger p-2 mb-0" style="font-size:.82rem">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            <span>Compact error with retry button.</span>
            <button type="button" class="btn btn-sm btn-outline-danger">Retry</button>
        </div>
    </div>
</div>


<div class="section-title mb-3"><span><?= h($txt['buttons_title']) ?></span></div>
<div class="card-altered p-4 mb-5">

    <!-- Boutons primaires (custom AlteredCore) -->
    <p class="small text-muted mb-2">btn-primary-altered</p>
    <div class="d-flex flex-wrap gap-2 mb-4">
        <button class="btn btn-primary-altered">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <button class="btn btn-primary-altered btn-sm">Save (sm)</button>
        <button class="btn btn-primary-altered" disabled>Disabled</button>
    </div>

    <!-- Boutons Bootstrap standards -->
    <p class="small text-muted mb-2">Bootstrap standards</p>
    <div class="d-flex flex-wrap gap-2 mb-4">
        <button class="btn btn-outline-secondary">btn-outline-secondary</button>
        <button class="btn btn-outline-secondary btn-sm">sm</button>
        <button class="btn btn-outline-danger">btn-outline-danger</button>
        <button class="btn btn-outline-danger btn-sm">sm</button>
        <button class="btn btn-secondary">btn-secondary</button>
        <button class="btn btn-danger">btn-danger</button>
    </div>

    <!-- Liens boutons custom -->
    <p class="small text-muted mb-2">Liens custom</p>
    <div class="d-flex flex-wrap align-items-center gap-3 mb-4">
        <a href="#" class="btn-read-more">btn-read-more →</a>
        <a href="#" class="btn-login">
            <i class="fa-solid fa-user me-1"></i> btn-login
        </a>
    </div>

    <!-- Boutons qui ouvrent les modals -->
    <p class="small text-muted mb-2"><?= h($txt['modal_title']) ?></p>
    <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-primary-altered" data-bs-toggle="modal" data-bs-target="#modalConfirm">
            <i class="fa-solid fa-up-right-from-square me-1"></i> <?= h($txt['modal_open']) ?> (confirmation)
        </button>
        <button class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#modalStandard">
            <?= h($txt['modal_open']) ?> (standard)
        </button>
    </div>
</div>


<div class="section-title mb-3"><span><?= h($txt['form_title']) ?></span></div>
<div class="card-altered p-4 mb-5">
    <form novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <!-- Ligne de deux champs -->
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <label class="form-label"><?= h($txt['form_name']) ?></label>
                <input type="text" class="form-control" placeholder="<?= h($txt['form_name']) ?>">
            </div>
            <div class="col-md-6">
                <label class="form-label"><?= h($txt['form_email']) ?></label>
                <input type="email" class="form-control" placeholder="user@example.com">
            </div>
        </div>

        <!-- Select -->
        <div class="mb-3">
            <label class="form-label"><?= h($txt['form_select']) ?></label>
            <select class="form-select" style="max-width:320px">
                <option value=""><?= h($txt['form_select']) ?></option>
                <option value="1"><?= h($txt['form_opt_1']) ?></option>
                <option value="2"><?= h($txt['form_opt_2']) ?></option>
                <option value="3"><?= h($txt['form_opt_3']) ?></option>
            </select>
        </div>

        <!-- Textarea -->
        <div class="mb-3">
            <label class="form-label"><?= h($txt['form_message']) ?></label>
            <textarea class="form-control" rows="4" placeholder="<?= h($txt['form_message']) ?>"></textarea>
        </div>

        <!-- Radios -->
        <div class="mb-3">
            <label class="form-label d-block"><?= h($txt['form_radio_1']) ?> / <?= h($txt['form_radio_2']) ?></label>
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="radio_ex" id="tplRadio1" value="a">
                <label class="form-check-label" for="tplRadio1"><?= h($txt['form_radio_1']) ?></label>
            </div>
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="radio_ex" id="tplRadio2" value="b" checked>
                <label class="form-check-label" for="tplRadio2"><?= h($txt['form_radio_2']) ?></label>
            </div>
        </div>

        <!-- Checkbox + Switch -->
        <div class="mb-3 d-flex flex-column gap-2">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="tplCheck">
                <label class="form-check-label" for="tplCheck"><?= h($txt['form_check']) ?></label>
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="tplSwitch" checked>
                <label class="form-check-label" for="tplSwitch"><?= h($txt['form_switch']) ?></label>
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary-altered">
                <i class="fa-solid fa-paper-plane me-1"></i> <?= h($txt['form_submit']) ?>
            </button>
            <button type="button" class="btn btn-outline-secondary"><?= h($txt['modal_cancel']) ?></button>
        </div>
    </form>
</div>


<div class="section-title mb-3"><span><?= h($txt['badges_title']) ?></span></div>
<div class="card-altered p-4 mb-5">

    <!-- Filtre catégories (cat-filter) -->
    <p class="small text-muted mb-2">cat-filter</p>
    <div class="cat-filter mb-4">
        <a href="#" class="active"><?= h($txt['filter_all']) ?></a>
        <a href="#"><?= h($txt['card_cat_1']) ?></a>
        <a href="#"><?= h($txt['card_cat_2']) ?></a>
        <a href="#"><?= h($txt['card_cat_3']) ?></a>
    </div>

    <!-- Badges custom -->
    <p class="small text-muted mb-2">badge-category + Bootstrap badges</p>
    <div class="d-flex flex-wrap gap-2">
        <span class="badge-category"><?= h($txt['card_cat_1']) ?></span>
        <span class="badge-category"><?= h($txt['card_cat_2']) ?></span>
        <span class="badge-category"><?= h($txt['card_cat_3']) ?></span>
        <span class="badge bg-secondary">secondary</span>
        <span class="badge bg-success">success</span>
        <span class="badge bg-danger">danger</span>
        <span class="badge bg-warning text-dark">warning</span>
        <span class="badge bg-info text-dark">info</span>
    </div>
</div>


<div class="section-title mb-3"><span><?= h($txt['cards_title']) ?></span></div>
<div class="row g-4 mb-5">

    <!-- Carte avec placeholder icône -->
    <div class="col-md-6 col-lg-4 d-flex">
        <div class="news-card w-100">
            <div class="news-card-img-placeholder">
                <i class="fa-solid fa-newspaper"></i>
            </div>
            <div class="news-card-body">
                <div class="news-card-meta">
                    <a href="#" class="badge-category"><?= h($txt['card_cat_1']) ?></a>
                    <span><i class="fa-regular fa-calendar me-1"></i><?= h(formatDate(date('Y-m-d'))) ?></span>
                </div>
                <div class="news-card-title"><a href="#"><?= h($txt['card_title_1']) ?></a></div>
                <div class="news-card-excerpt"><?= h($txt['card_excerpt']) ?></div>
                <div class="news-card-footer">
                    <a href="#" class="btn-read-more"><?= h($txt['card_read_more']) ?> →</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Carte avec image -->
    <div class="col-md-6 col-lg-4 d-flex">
        <div class="news-card w-100">
            <a href="#" tabindex="-1">
                <img src="https://placehold.co/480x240/EDE3CC/534B40?text=Image"
                     alt="" class="news-card-img" loading="lazy">
            </a>
            <div class="news-card-body">
                <div class="news-card-meta">
                    <a href="#" class="badge-category"><?= h($txt['card_cat_2']) ?></a>
                    <span><i class="fa-regular fa-calendar me-1"></i><?= h(formatDate(date('Y-m-d'))) ?></span>
                </div>
                <div class="news-card-title"><a href="#"><?= h($txt['card_title_2']) ?></a></div>
                <div class="news-card-excerpt"><?= h($txt['card_excerpt']) ?></div>
                <div class="news-card-footer">
                    <a href="#" class="btn-read-more"><?= h($txt['card_read_more']) ?> →</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Carte sans extrait -->
    <div class="col-md-6 col-lg-4 d-flex">
        <div class="news-card w-100">
            <div class="news-card-img-placeholder">
                <i class="fa-solid fa-bolt"></i>
            </div>
            <div class="news-card-body">
                <div class="news-card-meta">
                    <a href="#" class="badge-category"><?= h($txt['card_cat_3']) ?></a>
                    <span><i class="fa-regular fa-calendar me-1"></i><?= h(formatDate(date('Y-m-d'))) ?></span>
                </div>
                <div class="news-card-title"><a href="#"><?= h($txt['card_title_3']) ?></a></div>
                <div class="news-card-footer">
                    <a href="#" class="btn-read-more"><?= h($txt['card_read_more']) ?> →</a>
                </div>
            </div>
        </div>
    </div>

</div>


<div class="section-title mb-3"><span><?= h($txt['pagination_title']) ?></span></div>
<div class="card-altered p-4 mb-5">
    <nav>
        <ul class="pagination pagination-altered mb-0">
            <li class="page-item disabled"><a class="page-link" href="#">«</a></li>
            <li class="page-item active"><a class="page-link" href="#">1</a></li>
            <li class="page-item"><a class="page-link" href="#">2</a></li>
            <li class="page-item"><a class="page-link" href="#">3</a></li>
            <li class="page-item"><a class="page-link" href="#">4</a></li>
            <li class="page-item"><a class="page-link" href="#">»</a></li>
        </ul>
    </nav>
</div>


<div class="section-title mb-3"><span><?= h($txt['tabs_title']) ?></span></div>
<div class="card-altered p-4 mb-5">
    <ul class="nav nav-tabs mb-3" id="tplTabs" role="tablist">
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="tplTab1-tab" data-bs-toggle="tab"
                    data-bs-target="#tplTab1" type="button" role="tab">
                <?= h($txt['tab_1_label']) ?>
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="tplTab2-tab" data-bs-toggle="tab"
                    data-bs-target="#tplTab2" type="button" role="tab">
                <?= h($txt['tab_2_label']) ?>
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="tplTab3-tab" data-bs-toggle="tab"
                    data-bs-target="#tplTab3" type="button" role="tab">
                <i class="fa-solid fa-star me-1"></i><?= h($txt['tab_3_label']) ?>
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link disabled" type="button" disabled>Disabled</button>
        </li>
    </ul>
    <div class="tab-content">
        <div class="tab-pane fade show active" id="tplTab1" role="tabpanel" aria-labelledby="tplTab1-tab">
            <p class="mb-0"><?= h($txt['tab_1_content']) ?></p>
        </div>
        <div class="tab-pane fade" id="tplTab2" role="tabpanel" aria-labelledby="tplTab2-tab">
            <p class="mb-0"><?= h($txt['tab_2_content']) ?></p>
        </div>
        <div class="tab-pane fade" id="tplTab3" role="tabpanel" aria-labelledby="tplTab3-tab">
            <p class="mb-0"><?= h($txt['tab_3_content']) ?></p>
        </div>
    </div>
</div>


<div class="section-title mb-3"><span><?= h($txt['profile_title']) ?></span></div>
<div class="card-altered p-4 mb-5">
    <div class="mb-3 pb-3" style="border-bottom:1px solid var(--sand-300)">
        <div style="font-size:2.5rem;margin-bottom:.5rem">
            <i class="fa-solid fa-circle-user" style="color:var(--primary-500)"></i>
        </div>
        <div style="font-weight:800;font-size:1.25rem">Username</div>
        <div style="font-size:.85rem;color:var(--neutral-500)">user@example.com</div>
    </div>
    <dl class="row mb-0" style="font-size:.9rem">
        <dt class="col-sm-5 text-muted"><?= h($txt['profile_type']) ?></dt>
        <dd class="col-sm-7">
            <i class="fa-solid fa-key me-1" style="color:var(--primary-500)"></i> Altered.re account
        </dd>
        <dt class="col-sm-5 text-muted"><?= h($txt['profile_since']) ?></dt>
        <dd class="col-sm-7"><?= date('d/m/Y') ?></dd>
    </dl>
    <div class="mt-3 pt-3" style="border-top:1px solid var(--sand-300)">
        <a href="#" class="btn btn-outline-secondary btn-sm">
            <i class="fa-solid fa-pen-to-square me-1"></i> Edit profile
        </a>
        <div class="mt-1" style="font-size:.8rem;color:var(--neutral-500)">
            Change your username, email or password.
        </div>
    </div>
</div>


<div class="section-title mb-3"><span><?= h($txt['detail_title']) ?></span></div>
<div class="mb-5">
    <a href="#" class="btn btn-outline-secondary btn-sm mb-4">
        <?= h($txt['detail_back']) ?>
    </a>
    <article>
        <div class="news-detail-header">
            <div class="news-card-meta mb-3">
                <a href="#" class="badge-category"><?= h($txt['card_cat_1']) ?></a>
                <span class="news-detail-meta">
                    <i class="fa-regular fa-calendar me-1"></i><?= h($txt['detail_pub']) ?> <?= date('d/m/Y') ?>
                </span>
            </div>
            <h2 class="news-detail-title"><?= h($txt['card_title_1']) ?></h2>
        </div>
        <img src="https://placehold.co/820x320/EDE3CC/534B40?text=Article+image"
             alt="" class="news-detail-image">
        <div class="news-detail-content mt-4">
            <p><?= $txt['detail_content'] ?></p>
            <p>Paragraph two with more content to illustrate line-height and spacing in the article body.</p>
        </div>
    </article>
</div>


<div class="section-title mb-3"><span><?= h($txt['misc_title']) ?></span></div>
<div class="card-altered p-4 mb-5">

    <!-- coming-soon-box -->
    <p class="small text-muted mb-2">coming-soon-box</p>
    <div class="coming-soon-box" style="padding:2rem 0 1.5rem">
        <i class="fa-solid fa-hourglass-half"></i>
        <h1><?= h($txt['coming_soon_lbl']) ?></h1>
        <p style="color:var(--neutral-500);font-size:.9rem">.coming-soon-box</p>
    </div>

    <hr style="border-color:var(--sand-300)">

    <!-- login-option (panneaux connexion) -->
    <p class="small text-muted mb-2"><?= h($txt['login_title']) ?></p>
    <div class="d-flex flex-column gap-3" style="max-width:420px">
        <a href="#" class="login-option text-decoration-none">
            <div class="login-option-icon">
                <i class="fa-solid fa-right-to-bracket"></i>
            </div>
            <div class="login-option-body">
                <div class="login-option-title"><?= h($txt['login_sign_in']) ?></div>
                <div class="login-option-desc"><?= h($txt['login_sign_in_desc']) ?></div>
            </div>
            <i class="fa-solid fa-chevron-right login-option-arrow"></i>
        </a>
        <a href="#" class="login-option login-option--register text-decoration-none">
            <div class="login-option-icon">
                <i class="fa-solid fa-user-plus"></i>
            </div>
            <div class="login-option-body">
                <div class="login-option-title"><?= h($txt['login_register']) ?></div>
                <div class="login-option-desc"><?= h($txt['login_register_desc']) ?></div>
            </div>
            <i class="fa-solid fa-chevron-right login-option-arrow"></i>
        </a>
    </div>

</div>

</div><!-- /.container -->


<div class="modal fade" id="modalConfirm" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:440px">
        <div class="modal-content" style="border-radius:1rem;border:none">
            <div class="modal-body p-4 text-center" style="background:var(--sand-100)">
                <div style="font-size:2.5rem;margin-bottom:.75rem">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#f87171"></i>
                </div>
                <h5 style="font-weight:800;color:var(--neutral-800)"><?= h($txt['modal_heading']) ?></h5>
                <p style="color:var(--neutral-600);font-size:.9rem;margin:.75rem 0 .5rem">
                    <?= h($txt['modal_body']) ?>
                </p>
                <p class="small" style="color:var(--neutral-400)">
                    <i class="fa-solid fa-circle-info me-1"></i>Note complémentaire optionnelle.
                </p>
                <div class="d-flex gap-2 mt-4">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="modal">
                        <?= h($txt['modal_cancel']) ?>
                    </button>
                    <button type="button" class="btn btn-danger flex-fill" data-bs-dismiss="modal">
                        <?= h($txt['modal_confirm']) ?>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>


<div class="modal fade" id="modalStandard" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= h($txt['modal_heading']) ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <?= h($txt['modal_body']) ?>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
                    <?= h($txt['modal_cancel']) ?>
                </button>
                <button type="button" class="btn btn-primary-altered btn-sm" data-bs-dismiss="modal">
                    <?= h($txt['modal_confirm']) ?>
                </button>
            </div>
        </div>
    </div>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
