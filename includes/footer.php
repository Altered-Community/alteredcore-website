<?php
// global loading spinner
// Usage (JS): window.acSpinner.show('Message…')  /  window.acSpinner.hide()
?>
<div id="ac-spinner" role="status" aria-live="polite"
     style="display:none;position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.45);align-items:center;justify-content:center">
    <div style="background:var(--sand-50,#fafaf7);border:2px solid var(--sand-200,#e8e4da);border-radius:12px;padding:20px 28px;display:flex;flex-direction:column;gap:10px;min-width:240px;box-shadow:0 4px 24px rgba(0,0,0,.18)">
        <div style="display:flex;align-items:center;gap:14px">
            <div class="spinner-border" aria-hidden="true"
                 style="width:1.5rem;height:1.5rem;border-width:3px;color:var(--primary-400,#6366f1);flex-shrink:0"></div>
            <span id="ac-spinner-label"
                  style="font-size:.92rem;font-weight:600;color:var(--neutral-700,#374151)"></span>
        </div>
        <div id="ac-progress-wrap" style="display:none">
            <div style="background:var(--sand-200,#e8e4da);border-radius:99px;height:6px;overflow:hidden">
                <div id="ac-progress-bar"
                     style="height:100%;background:var(--primary-400,#C9A84C);border-radius:99px;width:0%;transition:width .3s ease"></div>
            </div>
        </div>
    </div>
</div>
<script>
// Usage: window.acSpinner.show('msg')  /  .progress(pct, 'msg')  /  .hide()
window.acSpinner = {
    show: function (msg) {
        var el  = document.getElementById('ac-spinner');
        var lbl = document.getElementById('ac-spinner-label');
        if (lbl && msg !== undefined) lbl.textContent = msg || '';
        if (el)  el.style.display = 'flex';
    },
    progress: function (pct, msg) {
        var wrap = document.getElementById('ac-progress-wrap');
        var bar  = document.getElementById('ac-progress-bar');
        if (wrap) wrap.style.display = '';
        if (bar)  bar.style.width = Math.min(100, Math.max(0, pct || 0)) + '%';
        this.show(msg);
    },
    hide: function () {
        var el   = document.getElementById('ac-spinner');
        var wrap = document.getElementById('ac-progress-wrap');
        var bar  = document.getElementById('ac-progress-bar');
        if (bar)  bar.style.width = '0%';
        if (wrap) wrap.style.display = 'none';
        if (el)   el.style.display  = 'none';
    }
};
</script>
<?php
require themeFile('footer.php');
