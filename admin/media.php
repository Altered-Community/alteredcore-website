<?php
$adminPageTitle = 'Media Library';
$adminSection   = 'media';
require_once __DIR__ . '/includes/header.php';

$csrf = csrfToken();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-images me-2"></i>Media Library</h1>
    <?php if (adminCanCreate()): ?>
    <button type="button" class="btn btn-outline-secondary btn-sm" id="btnNewFolder">
        <i class="fa-solid fa-folder-plus me-1"></i> New folder
    </button>
    <?php endif; ?>
</div>

<!-- New folder dialog -->
<?php if (adminCanCreate()): ?>
<div id="newFolderBar" style="display:none" class="mb-3">
    <div class="d-flex gap-2 align-items-center" style="max-width:400px">
        <input type="text" id="newFolderName" class="form-control form-control-sm"
               placeholder="folder-name (a-z, 0-9, - _)" maxlength="40">
        <button type="button" class="btn btn-primary-altered btn-sm" id="btnCreateFolder">Create</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="btnCancelFolder">Cancel</button>
    </div>
    <div id="newFolderError" class="text-danger small mt-1" style="display:none"></div>
</div>
<?php endif; ?>

<!-- Folder tabs -->
<div id="folderTabs" class="d-flex flex-wrap gap-1 mb-3" style="min-height:34px">
    <span class="text-muted small" id="tabsLoading"><i class="fa-solid fa-spinner fa-spin me-1"></i>Loading…</span>
</div>

<!-- Upload bar -->
<?php if (adminCanCreate()): ?>
<div class="card-altered p-3 mb-3" id="uploadZone" style="border:2px dashed var(--sand-300);cursor:pointer;transition:border-color .15s">
    <div class="d-flex align-items-center gap-3 flex-wrap">
        <div id="dropMsg" style="flex:1;color:var(--neutral-500);font-size:.875rem">
            <i class="fa-solid fa-cloud-arrow-up me-2"></i>
            Drag & drop images here, or <label for="fileInput" style="color:var(--primary-500);cursor:pointer;text-decoration:underline">browse</label>
            <input type="file" id="fileInput" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" style="display:none">
        </div>
        <div id="uploadProgress" style="display:none;flex:1">
            <div class="progress" style="height:8px">
                <div class="progress-bar" id="progressBar" role="progressbar" style="width:0%"></div>
            </div>
            <div id="uploadStatus" class="small text-muted mt-1"></div>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- Image grid -->
<div id="mediaGrid" class="row g-3">
    <div class="col-12 text-muted text-center py-5"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading…</div>
</div>

<!-- Empty state -->
<p id="mediaEmpty" class="text-muted text-center py-4" style="display:none">No images in this folder yet.</p>

<script>
(function () {
    var BASE      = '<?= BASE_URL ?>';
    var CSRF      = '<?= h($csrf) ?>';
    var canDelete = <?= adminCanDelete() ? 'true' : 'false' ?>;
    var canCreate = <?= adminCanCreate() ? 'true' : 'false' ?>;
    var _folder   = '';

    // helpers
    function escH(s) {
        return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function fmtSize(bytes) {
        if (bytes < 1024)       return bytes + ' B';
        if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
        return (bytes/(1024*1024)).toFixed(1) + ' MB';
    }

    // folder tabs
    function loadFolders(selectFolder) {
        fetch(BASE + '/admin/media-library.php?action=list-folders', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var tabs = document.getElementById('folderTabs');
                tabs.innerHTML = '';
                if (!data.ok || !data.folders.length) {
                    tabs.innerHTML = '<span class="text-muted small">No folders yet. Create one above.</span>';
                    document.getElementById('mediaGrid').innerHTML = '';
                    return;
                }
                data.folders.forEach(function (f) {
                    var btn = document.createElement('button');
                    btn.type      = 'button';
                    btn.className = 'btn btn-sm btn-outline-secondary';
                    btn.dataset.folder = f.name;
                    btn.innerHTML = escH(f.name) + ' <span class="badge bg-secondary ms-1">' + f.count + '</span>';
                    btn.addEventListener('click', function () { switchFolder(f.name); });
                    tabs.appendChild(btn);
                });
                var target = selectFolder || data.folders[0].name;
                switchFolder(target);
            })
            .catch(function () {
                document.getElementById('folderTabs').innerHTML = '<span class="text-danger small">Failed to load folders.</span>';
            });
    }

    function switchFolder(name) {
        _folder = name;
        document.querySelectorAll('#folderTabs button').forEach(function (b) {
            b.classList.toggle('btn-primary-altered', b.dataset.folder === name);
            b.classList.toggle('btn-outline-secondary', b.dataset.folder !== name);
        });
        loadImages(name);
    }

    function refreshTabCount(folder) {
        fetch(BASE + '/admin/media-library.php?action=list-folders', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.ok) return;
                data.folders.forEach(function (f) {
                    var btn = document.querySelector('#folderTabs button[data-folder="' + f.name + '"]');
                    if (btn) btn.innerHTML = escH(f.name) + ' <span class="badge bg-secondary ms-1">' + f.count + '</span>';
                });
            });
    }

    // image grid
    function loadImages(folder) {
        var grid  = document.getElementById('mediaGrid');
        var empty = document.getElementById('mediaEmpty');
        grid.innerHTML  = '<div class="col-12 text-muted text-center py-5"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading…</div>';
        empty.style.display = 'none';

        fetch(BASE + '/admin/media-library.php?action=list&folder=' + encodeURIComponent(folder), { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                grid.innerHTML = '';
                if (!data.ok || !data.images.length) {
                    empty.style.display = '';
                    return;
                }
                data.images.forEach(function (img) { grid.appendChild(makeCard(img, folder)); });
            })
            .catch(function () {
                grid.innerHTML = '<div class="col-12"><p class="text-danger text-center">Failed to load images.</p></div>';
            });
    }

    function makeCard(img, folder) {
        var col = document.createElement('div');
        col.className = 'col-6 col-sm-4 col-md-3 col-lg-2';
        col.dataset.imgPath = img.path;

        var card = '<div class="card-altered h-100" style="overflow:hidden">'
            + '<div style="height:130px;overflow:hidden;background:var(--sand-200);display:flex;align-items:center;justify-content:center;position:relative">'
            + '<img src="' + escH(img.url) + '" alt="' + escH(img.name) + '" loading="lazy"'
            + ' style="max-width:100%;max-height:130px;object-fit:cover;cursor:pointer"'
            + ' title="' + escH(img.name) + '">'
            + '</div>'
            + '<div class="p-2">'
            + '<div class="text-truncate fw-semibold" style="font-size:.78rem" title="' + escH(img.name) + '">' + escH(img.name) + '</div>'
            + '<div class="text-muted" style="font-size:.72rem">' + (img.size ? fmtSize(img.size) : '') + '</div>'
            + '<div class="d-flex gap-1 mt-2">'
            + '<button type="button" class="btn btn-xs btn-outline-secondary flex-fill js-copy-url" style="font-size:.72rem;padding:2px 0"'
            + ' title="Copy URL"><i class="fa-solid fa-copy"></i></button>';

        if (canDelete) {
            card += '<button type="button" class="btn btn-xs btn-outline-danger flex-fill js-delete" style="font-size:.72rem;padding:2px 0"'
                + ' title="Delete"><i class="fa-solid fa-trash"></i></button>';
        }

        card += '</div></div></div>';
        col.innerHTML = card;

        // Bind via closures — avoids JS string escaping issues with arbitrary filenames/URLs
        col.querySelector('img').addEventListener('click', function () { window.open(img.url, '_blank'); });
        col.querySelector('.js-copy-url').addEventListener('click', function () { copyUrl(img.url, this); });
        if (canDelete) {
            col.querySelector('.js-delete').addEventListener('click', function () { deleteImg(img.name, folder, col); });
        }

        return col;
    }

    function copyUrl(url, btn) {
        navigator.clipboard.writeText(url).then(function () {
            var orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(function () { btn.innerHTML = orig; }, 1500);
        });
    };

    function deleteImg(filename, folder, card) {
        if (!confirm('Delete "' + filename + '"?')) return;
        var fd = new FormData();
        fd.append('action', 'delete');
        fd.append('folder', folder);
        fd.append('file',   filename);
        fd.append('csrf_token', CSRF);
        fetch(BASE + '/admin/media-library.php', { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    card.remove();
                    var grid = document.getElementById('mediaGrid');
                    if (!grid.children.length) document.getElementById('mediaEmpty').style.display = '';
                    refreshTabCount(folder);
                } else {
                    alert('Error: ' + (data.error || 'unknown'));
                }
            })
            .catch(function () { alert('Request failed.'); });
    };

    // upload
    if (canCreate) {
        var zone     = document.getElementById('uploadZone');
        var fileInput= document.getElementById('fileInput');
        var progress = document.getElementById('uploadProgress');
        var bar      = document.getElementById('progressBar');
        var status   = document.getElementById('uploadStatus');

        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.style.borderColor = 'var(--primary-400)'; });
        zone.addEventListener('dragleave', function () { zone.style.borderColor = 'var(--sand-300)'; });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            zone.style.borderColor = 'var(--sand-300)';
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        });
        zone.addEventListener('click', function (e) { if (e.target !== fileInput) fileInput.click(); });
        fileInput.addEventListener('change', function () { if (fileInput.files.length) uploadFiles(fileInput.files); });

        function uploadFiles(files) {
            if (!_folder) { alert('Select a folder first.'); return; }
            var arr = Array.from(files);
            var done = 0;
            progress.style.display = '';
            document.getElementById('dropMsg').style.display = 'none';

            function uploadOne(file) {
                status.textContent = 'Uploading ' + file.name + ' (' + (done + 1) + '/' + arr.length + ')…';
                bar.style.width = Math.round(done / arr.length * 100) + '%';
                var fd = new FormData();
                fd.append('action', 'upload');
                fd.append('folder', _folder);
                fd.append('file',   file);
                fd.append('csrf_token', CSRF);
                return fetch(BASE + '/admin/media-library.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        done++;
                        if (!data.ok) { status.textContent = 'Error: ' + (data.error || 'unknown'); }
                    })
                    .catch(function () { done++; status.textContent = 'Upload failed for ' + file.name; });
            }

            arr.reduce(function (p, file) { return p.then(function () { return uploadOne(file); }); }, Promise.resolve())
               .then(function () {
                   bar.style.width = '100%';
                   status.textContent = done + ' file' + (done > 1 ? 's' : '') + ' uploaded.';
                   setTimeout(function () {
                       progress.style.display = 'none';
                       document.getElementById('dropMsg').style.display = '';
                       fileInput.value = '';
                       bar.style.width = '0%';
                   }, 2000);
                   loadImages(_folder);
                   refreshTabCount(_folder);
               });
        }
    }

    // new folder
    if (canCreate) {
        var btnNew    = document.getElementById('btnNewFolder');
        var bar2      = document.getElementById('newFolderBar');
        var inp       = document.getElementById('newFolderName');
        var btnCreate = document.getElementById('btnCreateFolder');
        var btnCancel = document.getElementById('btnCancelFolder');
        var errDiv    = document.getElementById('newFolderError');

        btnNew.addEventListener('click', function () { bar2.style.display = ''; inp.focus(); });
        btnCancel.addEventListener('click', function () { bar2.style.display = 'none'; inp.value = ''; errDiv.style.display = 'none'; });

        btnCreate.addEventListener('click', function () {
            var name = inp.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g,'-').replace(/^-|-$/g,'');
            if (!name) { errDiv.textContent = 'Invalid name.'; errDiv.style.display = ''; return; }
            var fd = new FormData();
            fd.append('action', 'create-folder');
            fd.append('folder', name);
            fd.append('csrf_token', CSRF);
            fetch(BASE + '/admin/media-library.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.ok) {
                        bar2.style.display = 'none'; inp.value = ''; errDiv.style.display = 'none';
                        loadFolders(name);
                    } else {
                        errDiv.textContent = data.error || 'Error'; errDiv.style.display = '';
                    }
                })
                .catch(function () { errDiv.textContent = 'Request failed.'; errDiv.style.display = ''; });
        });

        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') btnCreate.click(); });
    }

    // init
    loadFolders();
})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
