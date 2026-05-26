<style>
.img-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: .5rem;
    max-height: 380px;
    overflow-y: auto;
    padding: .5rem;
    background: var(--sand-100, #f8f4ed);
    border-radius: .5rem;
    border: 1px solid var(--neutral-300, #ddd);
}
.img-picker-item {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: .5rem;
    overflow: hidden;
    background: #fff;
    padding: 4px;
    transition: border-color .15s;
    text-align: center;
}
.img-picker-item:hover { border-color: var(--primary-400, #8B7355); }
.img-picker-item.selected {
    border-color: var(--primary-600, #5a4a2e);
    background: var(--sand-200, #f0e8d6);
}
.img-picker-item img {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
    display: block;
    margin: 0 auto 3px;
}
.img-picker-item .img-picker-name {
    font-size: 10px;
    color: #777;
    word-break: break-all;
    display: block;
    line-height: 1.2;
}
</style>

<!-- Image Picker Modal -->
<div class="modal fade" id="imgPickerModal" tabindex="-1" aria-labelledby="imgPickerModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="imgPickerModalLabel">
                    <i class="fa-solid fa-images me-2"></i>Choose an image
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <ul class="nav nav-tabs mb-3" id="imgPickerTabs" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active" id="imgPickerTabLibraryBtn" data-picker-tab="library">
                            <i class="fa-solid fa-photo-film me-1"></i> Library
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" id="imgPickerTabUploadBtn" data-picker-tab="upload">
                            <i class="fa-solid fa-upload me-1"></i> Upload new
                        </button>
                    </li>
                </ul>

                <div id="imgPickerPanelLibrary">
                    <div id="imgPickerGrid" class="img-picker-grid">
                        <div class="text-muted text-center py-4" style="grid-column:1/-1">
                            <i class="fa-solid fa-spinner fa-spin me-2"></i>Loading…
                        </div>
                    </div>
                </div>

                <div id="imgPickerPanelUpload" style="display:none">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Select a file to upload</label>
                        <input type="file" id="imgPickerFileInput" class="form-control"
                               accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml">
                        <div class="form-text" id="imgPickerAcceptNote">JPG, PNG, WebP or GIF — max 5 MB</div>
                    </div>
                    <div id="imgPickerUploadPreview" class="mb-3" style="display:none">
                        <img id="imgPickerUploadThumb" src="" alt=""
                             style="max-height:120px;border-radius:6px;border:1px solid var(--neutral-300)">
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <button type="button" class="btn btn-sm btn-primary-altered" id="imgPickerUploadBtn" disabled>
                            <i class="fa-solid fa-cloud-arrow-up me-1"></i> Upload &amp; select
                        </button>
                        <span class="text-muted small" id="imgPickerUploadStatus"></span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary-altered" id="imgPickerSelectBtn" disabled>
                    <i class="fa-solid fa-check me-1"></i> Select
                </button>
            </div>
        </div>
    </div>
</div>

<script>
(function () {
    var _modal = null, _bsModal = null;
    var _cfg = {};      // { inputId, previewId, folder, baseUrl, csrfToken }
    var _selected = null;

    function ensureModal() {
        if (!_modal) {
            _modal = document.getElementById('imgPickerModal');
            _bsModal = new bootstrap.Modal(_modal);
        }
    }

    function escH(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function setSelected(item) {
        _selected = item;
        document.getElementById('imgPickerSelectBtn').disabled = !item;
        _modal.querySelectorAll('.img-picker-item').forEach(function (el) {
            el.classList.toggle('selected', !!item && el.dataset.path === item.path);
        });
    }

    function applySelection() {
        if (!_selected) return;
        var inp = document.getElementById(_cfg.inputId);
        if (inp) inp.value = _selected.path;
        var prev = document.getElementById(_cfg.previewId);
        if (prev) {
            var img = prev.querySelector('img');
            if (img) img.src = _selected.url;
            prev.style.display = '';
        }
        _bsModal.hide();
    }

    function loadLibrary(folder) {
        var grid = document.getElementById('imgPickerGrid');
        grid.innerHTML = '<div class="text-muted text-center py-4" style="grid-column:1/-1"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading…</div>';
        fetch(_cfg.baseUrl + '/admin/media-library.php?action=list&folder=' + encodeURIComponent(folder))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.ok || !data.images.length) {
                    grid.innerHTML = '<p class="text-muted text-center py-4" style="grid-column:1/-1">No images in this folder yet.</p>';
                    return;
                }
                var html = '';
                data.images.forEach(function (img) {
                    html += '<div class="img-picker-item" data-path="' + escH(img.path) + '" data-url="' + escH(img.url) + '">'
                          + '<img src="' + escH(img.url) + '" alt="' + escH(img.name) + '" loading="lazy">'
                          + '<span class="img-picker-name">' + escH(img.name) + '</span>'
                          + '</div>';
                });
                grid.innerHTML = html;
                grid.querySelectorAll('.img-picker-item').forEach(function (el) {
                    el.addEventListener('click', function () { setSelected({ path: el.dataset.path, url: el.dataset.url }); });
                    el.addEventListener('dblclick', function () {
                        setSelected({ path: el.dataset.path, url: el.dataset.url });
                        applySelection();
                    });
                });
            })
            .catch(function () {
                grid.innerHTML = '<p class="text-danger text-center py-4" style="grid-column:1/-1">Failed to load library.</p>';
            });
    }

    function switchTab(tab) {
        _modal.querySelectorAll('#imgPickerTabs .nav-link').forEach(function (b) { b.classList.remove('active'); });
        _modal.querySelector('[data-picker-tab="' + tab + '"]').classList.add('active');
        document.getElementById('imgPickerPanelLibrary').style.display = tab === 'library' ? '' : 'none';
        document.getElementById('imgPickerPanelUpload').style.display  = tab === 'upload'  ? '' : 'none';
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureModal();

        // Tab clicks
        _modal.querySelectorAll('#imgPickerTabs .nav-link').forEach(function (btn) {
            btn.addEventListener('click', function () { switchTab(btn.dataset.pickerTab); });
        });

        // Confirm button
        document.getElementById('imgPickerSelectBtn').addEventListener('click', applySelection);

        // Upload tab: file preview
        var fileInput   = document.getElementById('imgPickerFileInput');
        var uploadBtn   = document.getElementById('imgPickerUploadBtn');
        var uploadPrev  = document.getElementById('imgPickerUploadPreview');
        var uploadThumb = document.getElementById('imgPickerUploadThumb');
        var uploadStat  = document.getElementById('imgPickerUploadStatus');

        fileInput.addEventListener('change', function () {
            uploadStat.textContent = '';
            if (!fileInput.files.length) { uploadBtn.disabled = true; uploadPrev.style.display = 'none'; return; }
            var f = fileInput.files[0];
            if (f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.svg')) {
                var reader = new FileReader();
                reader.onload = function (e) { uploadThumb.src = e.target.result; uploadPrev.style.display = ''; };
                reader.readAsDataURL(f);
            }
            uploadBtn.disabled = false;
        });

        uploadBtn.addEventListener('click', function () {
            if (!fileInput.files.length) return;
            uploadBtn.disabled = true;
            uploadStat.textContent = 'Uploading…';
            var fd = new FormData();
            fd.append('action', 'upload');
            fd.append('folder', _cfg.folder);
            fd.append('csrf_token', _cfg.csrfToken);
            fd.append('file', fileInput.files[0]);
            fetch(_cfg.baseUrl + '/admin/media-library.php', { method: 'POST', body: fd })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.ok) {
                        _selected = { path: data.path, url: data.url };
                        applySelection();
                    } else {
                        uploadStat.textContent = data.error || 'Upload failed.';
                        uploadBtn.disabled = false;
                    }
                })
                .catch(function () { uploadStat.textContent = 'Upload error.'; uploadBtn.disabled = false; });
        });

        // Event delegation: open picker button
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.img-picker-btn');
            if (btn) {
                var w = btn.closest('.img-picker-widget');
                _cfg = {
                    inputId:   w.dataset.input,
                    previewId: w.dataset.preview,
                    folder:    w.dataset.folder,
                    baseUrl:   w.dataset.baseUrl,
                    csrfToken: w.dataset.csrf,
                };
                _selected = null;
                switchTab('library');
                document.getElementById('imgPickerFileInput').value = '';
                uploadPrev.style.display = 'none';
                uploadBtn.disabled = true;
                uploadStat.textContent = '';
                document.getElementById('imgPickerSelectBtn').disabled = true;
                loadLibrary(_cfg.folder);
                _bsModal.show();
                return;
            }

            // Clear button
            var clr = e.target.closest('.img-picker-clear');
            if (clr) {
                var w = clr.closest('.img-picker-widget');
                var inp = document.getElementById(w.dataset.input);
                var currentVal = inp ? inp.value : '';
                // Clearing the original DB value requires delete permission
                if (w.dataset.canDelete === '0' && currentVal !== '' && currentVal === w.dataset.original) {
                    alert('You do not have permission to delete images.');
                    return;
                }
                if (inp) inp.value = '';
                var prev = document.getElementById(w.dataset.preview);
                if (prev) prev.style.display = 'none';
            }
        });
    });
})();
</script>
