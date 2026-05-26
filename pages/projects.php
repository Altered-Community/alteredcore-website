<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();
$lang = getLang();

// translations
$txt = [
    'en' => [
        'page_title'    => 'Community Projects',
        'section_title' => 'Community Projects',
        'intro'         => 'Discover projects created by the Altered TCG community. Tools, apps, resources — everything the community builds around the game.',

        'submit_btn'    => 'Submit your project',
        'modal_title'   => 'Submit your project',
        'modal_intro'   => 'Share your project with the community! Fill in the form below and we will review it before publishing.',
        'lbl_title'     => 'Project name',
        'lbl_url'       => 'Project URL',
        'lbl_desc'      => 'Short description',
        'lbl_contact'   => 'Your name, email or Discord',
        'lbl_contact_h' => 'Any way to reach you (name, email, Discord…).',
        'lbl_screenshot' => 'Screenshot URL',
        'lbl_screenshot_h' => 'Optional — link to an image showing your tool.',
        'cancel'        => 'Cancel',
        'send'          => 'Submit',
        'success'       => 'Your project has been submitted! We will review it shortly.',
        'err_title'     => 'Project name is required.',
        'err_url'       => 'A valid URL is required.',
        'err_contact'   => 'Please tell us how to reach you.',
        'err_token'     => 'Invalid form token. Please try again.',
        'no_projects'   => 'No projects yet. Be the first to submit one!',
        'submitted_by'  => 'By',
        'all_cats'      => 'All',
    ],
    'fr' => [
        'page_title'    => 'Projets communautaires',
        'section_title' => 'Projets communautaires',
        'intro'         => 'Découvrez les projets créés par la communauté Altered TCG. Outils, applications, ressources — tout ce que la communauté construit autour du jeu.',

        'submit_btn'    => 'Soumettre votre projet',
        'modal_title'   => 'Soumettre votre projet',
        'modal_intro'   => 'Partagez votre projet avec la communauté ! Remplissez le formulaire ci-dessous et nous l\'examinerons avant de le publier.',
        'lbl_title'     => 'Nom du projet',
        'lbl_url'       => 'URL du projet',
        'lbl_desc'      => 'Description courte',
        'lbl_contact'   => 'Votre nom, e-mail ou Discord',
        'lbl_contact_h' => 'N\'importe quel moyen de vous contacter (nom, e-mail, Discord…).',
        'lbl_screenshot' => 'URL d\'une capture d\'écran',
        'lbl_screenshot_h' => 'Optionnel — lien vers une image illustrant votre outil.',
        'cancel'        => 'Annuler',
        'send'          => 'Soumettre',
        'success'       => 'Votre projet a été soumis ! Nous l\'examinerons prochainement.',
        'err_title'     => 'Le nom du projet est requis.',
        'err_url'       => 'Une URL valide est requise.',
        'err_contact'   => 'Veuillez indiquer un moyen de vous contacter.',
        'err_token'     => 'Jeton de formulaire invalide. Veuillez réessayer.',
        'no_projects'   => 'Aucun projet pour l\'instant. Soyez le premier à en soumettre un !',
        'submitted_by'  => 'Par',
        'all_cats'      => 'Tous',
    ],
][getUiLang()] ?? [];

// handle project submission
$submitErrors  = [];
$submitSuccess = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['project_submit'])) {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $submitErrors[] = $txt['err_token'];
    } else {
        $pTitle      = trim($_POST['p_title']      ?? '');
        $pUrl        = trim($_POST['p_url']        ?? '');
        $pDesc       = trim($_POST['p_desc']       ?? '');
        $pContact    = trim($_POST['p_contact']    ?? '');
        $pScreenshot = trim($_POST['p_screenshot'] ?? '');

        if ($pTitle   === '') $submitErrors[] = $txt['err_title'];
        if ($pUrl     === '' || !filter_var($pUrl, FILTER_VALIDATE_URL)) $submitErrors[] = $txt['err_url'];
        if ($pContact === '') $submitErrors[] = $txt['err_contact'];
        if ($pScreenshot !== '' && !filter_var($pScreenshot, FILTER_VALIDATE_URL)) {
            $submitErrors[] = ($lang === 'fr') ? 'L\'URL de la capture d\'écran n\'est pas valide.' : 'The screenshot URL is not valid.';
        }

        if (empty($submitErrors)) {
            try {
                $db = getDB();
                $db->prepare(q(
                    "INSERT INTO {projects} (title, description, url, image, submitted_by, source, is_approved, is_visible)
                     VALUES (:title, :desc, :url, :image, :contact, 'user', 0, 0)"
                ))->execute([
                    ':title'   => $pTitle,
                    ':desc'    => $pDesc ?: null,
                    ':url'     => $pUrl,
                    ':image'   => $pScreenshot ?: null,
                    ':contact' => $pContact,
                ]);
                $submitSuccess = true;
            } catch (Exception $e) {
                $submitErrors[] = 'An error occurred. Please try again.';
            }
        }
    }
}

// load categories & projects from DB
$projectCats = [];
try {
    $projectCats = getProjectCategories();
} catch (Exception $e) {}

$catSlug = trim($_GET['cat'] ?? '');
$activeCatId = null;
foreach ($projectCats as $pc) {
    if ($pc['slug'] === $catSlug) { $activeCatId = (int)$pc['id']; break; }
}

$projects = [];
try {
    $db = getDB();
    if ($activeCatId !== null) {
        $stmt = $db->prepare(q(
            "SELECT p.id, p.title, p.description, p.url, p.image, p.submitted_by,
                    c.name_" . getUiLang() . " AS category_name, c.slug AS category_slug
             FROM {projects} p
             LEFT JOIN {project_categories} c ON c.id = p.category_id
             WHERE p.is_approved = 1 AND p.is_visible = 1 AND p.category_id = :cat
             ORDER BY p.sort_order ASC, p.created_at ASC"
        ));
        $stmt->execute([':cat' => $activeCatId]);
    } else {
        $stmt = $db->query(q(
            "SELECT p.id, p.title, p.description, p.url, p.image, p.submitted_by,
                    c.name_" . getUiLang() . " AS category_name, c.slug AS category_slug
             FROM {projects} p
             LEFT JOIN {project_categories} c ON c.id = p.category_id
             WHERE p.is_approved = 1 AND p.is_visible = 1
             ORDER BY p.sort_order ASC, p.created_at ASC"
        ));
    }
    $projects = $stmt->fetchAll();
} catch (Exception $e) {
    // silently degrade — show empty list
}

$pageTitle = $txt['page_title'];
include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4">

    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div class="section-title mb-0">
            <span><?= h($txt['section_title']) ?></span>
        </div>
        <button type="button" class="btn btn-primary-altered btn-sm" data-bs-toggle="modal" data-bs-target="#submitProjectModal">
            <i class="fa-solid fa-plus me-1"></i><?= h($txt['submit_btn']) ?>
        </button>
    </div>

    <div class="alert d-flex align-items-start gap-3 mb-4"
         style="background:var(--sand-100);border:2px solid var(--sand-300);border-radius:.75rem;color:var(--neutral-700)">
        <div><?= h($txt['intro']) ?></div>
    </div>

    <?php if (!empty($projectCats)): ?>
    <div class="cat-filter mb-5">
        <a href="<?= BASE_URL ?>/pages/projects" class="<?= $catSlug === '' ? 'active' : '' ?>">
            <?= h($txt['all_cats']) ?>
        </a>
        <?php foreach ($projectCats as $pc): ?>
        <a href="<?= BASE_URL ?>/pages/projects?cat=<?= urlencode($pc['slug']) ?>"
           class="<?= $catSlug === $pc['slug'] ? 'active' : '' ?>">
            <?= h($pc['name']) ?>
        </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if ($submitSuccess): ?>
        <div class="alert alert-success mb-4"><?= h($txt['success']) ?></div>
    <?php endif; ?>

    <?php if (empty($projects)): ?>
        <p class="text-muted"><?= h($txt['no_projects']) ?></p>
    <?php else: ?>
    <div class="row g-4">
        <?php foreach ($projects as $p): ?>
        <div class="col-md-6 col-lg-3 d-flex">
            <div class="news-card w-100">
                <div style="position:relative">
                    <a href="<?= h($p['url']) ?>" target="_blank" rel="noopener noreferrer" tabindex="-1">
                        <?php if (!empty($p['image'])): ?>
                            <img src="<?= h(assetUrl($p['image'])) ?>" alt="<?= h($p['title']) ?>" class="news-card-img">
                        <?php else: ?>
                            <div class="news-card-img-placeholder">
                                <i class="fa-solid fa-rocket"></i>
                            </div>
                        <?php endif; ?>
                    </a>
                    <?php if (!empty($p['category_name'])): ?>
                        <a href="<?= BASE_URL ?>/pages/projects?cat=<?= urlencode($p['category_slug']) ?>"
                           class="badge-category"
                           style="position:absolute;bottom:.5rem;right:.5rem"><?= h($p['category_name']) ?></a>
                    <?php endif; ?>
                </div>
                <div class="news-card-body">
                    <div class="news-card-title">
                        <a href="<?= h($p['url']) ?>" target="_blank" rel="noopener noreferrer">
                            <?= h($p['title']) ?>
                        </a>
                    </div>
                    <?php if (!empty($p['description'])): ?>
                        <div class="news-card-excerpt"><?= h($p['description']) ?></div>
                    <?php endif; ?>
                    <?php if (!empty($p['submitted_by'])): ?>
                        <div class="news-card-meta mt-2 mb-0">
                            <span><i class="fa-solid fa-user me-1"></i><?= h($txt['submitted_by']) ?> <?= h($p['submitted_by']) ?></span>
                        </div>
                    <?php endif; ?>

                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

</div>

<!-- Submit project modal -->
<div class="modal fade" id="submitProjectModal" tabindex="-1" aria-labelledby="submitProjectModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content" style="border:none;border-radius:1rem;overflow:hidden">
            <form method="post" novalidate style="display:flex;flex-direction:column;overflow:hidden;min-height:0;flex:1 1 auto">
                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                <input type="hidden" name="project_submit" value="1">

                <div class="modal-header" style="border-bottom:1px solid var(--sand-300)">
                    <h5 class="modal-title" id="submitProjectModalLabel">
                        <i class="fa-solid fa-rocket me-2"></i><?= h($txt['modal_title']) ?>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>

                <div class="modal-body" style="background:var(--sand-50)">
                    <p class="text-muted small mb-4"><?= h($txt['modal_intro']) ?></p>

                    <?php if (!empty($submitErrors)): ?>
                        <div class="alert alert-danger">
                            <ul class="mb-0">
                                <?php foreach ($submitErrors as $e): ?>
                                    <li><?= h($e) ?></li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endif; ?>

                    <div class="mb-3">
                        <label class="form-label fw-semibold">
                            <?= h($txt['lbl_title']) ?> <span class="text-danger">*</span>
                        </label>
                        <input type="text" name="p_title" class="form-control"
                               value="<?= h($_POST['p_title'] ?? '') ?>" maxlength="255" required>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold">
                            <?= h($txt['lbl_url']) ?> <span class="text-danger">*</span>
                        </label>
                        <input type="url" name="p_url" class="form-control"
                               value="<?= h($_POST['p_url'] ?? '') ?>" maxlength="500"
                               placeholder="https://…" required>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold"><?= h($txt['lbl_desc']) ?></label>
                        <textarea name="p_desc" class="form-control" rows="3" maxlength="1000"><?= h($_POST['p_desc'] ?? '') ?></textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold">
                            <?= h($txt['lbl_contact']) ?> <span class="text-danger">*</span>
                        </label>
                        <input type="text" name="p_contact" class="form-control"
                               value="<?= h($_POST['p_contact'] ?? '') ?>" maxlength="255" required>
                        <div class="form-text"><?= h($txt['lbl_contact_h']) ?></div>
                    </div>

                    <div class="mb-1">
                        <label class="form-label fw-semibold"><?= h($txt['lbl_screenshot']) ?></label>
                        <input type="url" name="p_screenshot" class="form-control"
                               value="<?= h($_POST['p_screenshot'] ?? '') ?>" maxlength="500"
                               placeholder="https://…">
                        <div class="form-text"><?= h($txt['lbl_screenshot_h']) ?></div>
                    </div>
                </div>

                <div class="modal-footer" style="border-top:1px solid var(--sand-300);background:var(--sand-50)">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        <?= h($txt['cancel']) ?>
                    </button>
                    <button type="submit" class="btn btn-primary-altered">
                        <i class="fa-solid fa-paper-plane me-1"></i><?= h($txt['send']) ?>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php if (!empty($submitErrors)): ?>
<script>
document.addEventListener('DOMContentLoaded', function () {
    var modal = new bootstrap.Modal(document.getElementById('submitProjectModal'));
    modal.show();
});
</script>
<?php endif; ?>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
