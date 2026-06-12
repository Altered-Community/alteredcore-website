    </div><!-- /.admin-main -->
</div><!-- /.admin-wrapper -->

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
(function () {
    var toggle  = document.getElementById('adminMenuToggle');
    var sidebar = document.querySelector('.admin-sidebar');
    var overlay = document.getElementById('adminSidebarOverlay');
    if (!toggle) return;
    function open()  { sidebar.classList.add('admin-sidebar-open');    overlay.classList.add('active');    document.body.style.overflow = 'hidden'; }
    function close() { sidebar.classList.remove('admin-sidebar-open'); overlay.classList.remove('active'); document.body.style.overflow = ''; }
    toggle.addEventListener('click', function () {
        sidebar.classList.contains('admin-sidebar-open') ? close() : open();
    });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    sidebar.querySelectorAll('.nav-link').forEach(function (a) {
        a.addEventListener('click', function () { if (window.innerWidth <= 768) close(); });
    });
})();
</script>

<?php if (isset($__codemirror_editor)): ?>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/theme/dracula.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/xml/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/css/css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/clike/clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/htmlmixed/htmlmixed.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/php/php.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/addon/selection/active-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/addon/search/searchcursor.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/addon/comment/comment.min.js"></script>
<script>
(function () {
    var ta = document.getElementById('page-code-editor');
    if (!ta) return;
    var cm = CodeMirror.fromTextArea(ta, {
        mode: 'application/x-httpd-php',
        theme: 'dracula',
        lineNumbers: true,
        matchBrackets: true,
        styleActiveLine: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: false,
        extraKeys: {
            'Tab': function (cm) { cm.replaceSelection('    '); },
            'Ctrl-/': 'toggleComment',
            'Cmd-/':  'toggleComment',
        }
    });
    cm.setSize(null, '70vh');
    // Sync back to textarea on form submit
    ta.form.addEventListener('submit', function () { cm.save(); });
})();
</script>
<?php endif; ?>

<?php
if (isset($__tinymce_editor) || isset($__tinymce_footer)):
    $_scFile = dirname(__DIR__, 2) . '/data/tinymce_shortcodes.json';
    $_scDefs = [];
    if (file_exists($_scFile)) {
        $_scJson = json_decode(file_get_contents($_scFile), true);
        $_scDefs = $_scJson['shortcodes'] ?? [];
    }
?>
<script src="<?= BASE_URL ?>/js/tinymce/tinymce.min.js"></script>
<script>
(function () {
    var BASE      = '<?= BASE_URL ?>';
    var pageLang  = '<?= h(getLang()) ?>';
    var CSRF_TOKEN = <?= json_encode(csrfToken()) ?>;
    var scDefs   = <?= json_encode($_scDefs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
    var THEME_CSS = '<?= themeUrl('style.css') ?>';

    // Open the shortcode insertion dialog for a given definition
    function openShortcodeDialog(editor, sc) {
        var initData = {};
        sc.params.forEach(function (p) {
            initData[p.name] = p.default !== undefined ? p.default : (p.type === 'checkbox' ? false : '');
        });
        // Pre-fill text from selection for btn shortcode
        if (sc.tag === 'btn') {
            var sel = editor.selection.getContent({ format: 'text' });
            if (sel) initData.text = sel;
        }
        // Pre-fill lang from current page language
        if (sc.tag === 'card' && initData.hasOwnProperty('lang')) {
            initData.lang = pageLang === 'fr' ? 'fr' : 'en';
        }
        editor.windowManager.open({
            title: sc.label,
            body: {
                type: 'panel',
                items: sc.params.map(function (p) {
                    var item = { type: p.type, name: p.name, label: p.label };
                    if (p.placeholder) item.placeholder = p.placeholder;
                    if (p.items)       item.items       = p.items;
                    return item;
                })
            },
            buttons: [
                { type: 'cancel', text: 'Cancel' },
                { type: 'submit', text: 'Insert', primary: true }
            ],
            initialData: initData,
            onSubmit: function (api) {
                var d = api.getData();
                for (var i = 0; i < sc.params.length; i++) {
                    if (sc.params[i].required && !String(d[sc.params[i].name] || '').trim()) {
                        api.close(); return;
                    }
                }
                var attrs = [];
                sc.params.forEach(function (p) {
                    var val = d[p.name];
                    if (p.type === 'checkbox') {
                        if (val) attrs.push(p.name + '="1"');
                    } else if (val !== undefined && String(val) !== '') {
                        attrs.push(p.name + '="' + String(val).replace(/"/g, '&quot;') + '"');
                    }
                });
                editor.insertContent('[' + sc.tag + (attrs.length ? ' ' + attrs.join(' ') : '') + ']');
                api.close();
            }
        });
    }

    function mceSetup(editor) {
        editor.on('change', function () { editor.save(); });

        // Dropdown menu button — all shortcodes in one menu
        editor.ui.registry.addMenuButton('sc_insert', {
            icon:    'sourcecode',
            tooltip: 'Insert shortcode',
            fetch: function (callback) {
                callback(scDefs.map(function (sc) {
                    var item = {
                        type:     'menuitem',
                        text:     sc.label,
                        onAction: function () { openShortcodeDialog(editor, sc); }
                    };
                    if (sc.mce_icon) item.icon = sc.mce_icon;
                    return item;
                }));
            }
        });

        // Individual buttons (kept for optional direct toolbar use)
        scDefs.forEach(function (sc) {
            editor.ui.registry.addButton(sc.button_id, {
                icon:    sc.mce_icon || 'code-sample',
                tooltip: sc.description || sc.label,
                onAction: function () { openShortcodeDialog(editor, sc); }
            });
        });
    }

    var mceBase = {
        plugins:  'advlist autolink lists link image charmap anchor searchreplace visualblocks code fullscreen table wordcount',
        toolbar:  'bold italic underline strikethrough | link image table | sc_insert | undo redo | alignleft aligncenter alignright | bullist numlist | forecolor backcolor | blocks fontsize | code fullscreen',
        fontsizes: '10px 11px 12px 13px 14px 16px 18px 20px 24px 28px 32px 36px',
        menubar:  false,
        automatic_uploads: true,
        images_upload_handler: function (blobInfo, progress) {
            return new Promise(function (resolve, reject) {
                var fd = new FormData();
                fd.append('file', blobInfo.blob(), blobInfo.filename());
                fd.append('csrf_token', CSRF_TOKEN);
                var xhr = new XMLHttpRequest();
                xhr.open('POST', BASE + '/admin/upload-image.php');
                xhr.withCredentials = true;
                xhr.onload = function () {
                    if (xhr.status !== 200) { reject('Upload failed (' + xhr.status + ')'); return; }
                    try {
                        var json = JSON.parse(xhr.responseText);
                        if (json.location) { resolve(json.location); } else { reject(json.error || 'Upload failed'); }
                    } catch (e) { reject('Invalid server response'); }
                };
                xhr.onerror = function () { reject('Network error'); };
                if (progress && xhr.upload) {
                    xhr.upload.onprogress = function (e) {
                        if (e.lengthComputable) progress(e.loaded / e.total * 100);
                    };
                }
                xhr.send(fd);
            });
        },
        file_picker_types:         'image',
        file_picker_callback: function (callback, value, meta) {
            if (meta.filetype !== 'image') return;
            var win = window.open(
                BASE + '/admin/tinymce-browser.php',
                'tinymcebrowser',
                'width=920,height=640,resizable=yes,scrollbars=yes'
            );
            window.tinymceBrowserCallback = function (url, alt) {
                callback(url, { alt: alt || '' });
                delete window.tinymceBrowserCallback;
            };
        },
        image_advtab:              true,
        relative_urls:             false,
        remove_script_host:        false,
        content_css: [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
            THEME_CSS,
        ],
        content_style: 'body { font-family: inherit; font-size: 15px; padding: 12px; }',
        skin:        'oxide',
        license_key: 'gpl',
        setup: mceSetup,
    };

    if (document.querySelector('.tinymce-editor')) {
        tinymce.init(Object.assign({}, mceBase, { selector: '.tinymce-editor', height: 420 }));
    }
    if (document.querySelector('.tinymce-footer')) {
        tinymce.init(Object.assign({}, mceBase, { selector: '.tinymce-footer', height: 240 }));
    }

    // Sync editor content and clear dirty flag before any form submit containing an editor
    document.querySelectorAll('form').forEach(function (f) {
        if (f.querySelector('.tinymce-editor, .tinymce-footer')) {
            f.addEventListener('submit', function () {
                tinymce.triggerSave();
                tinymce.get().forEach(function (ed) { ed.setDirty(false); });
            });
        }
    });
})();
</script>
<?php endif; ?>

<?php require_once __DIR__ . '/image-picker.php'; ?>
</body>
</html>
