// Pointer + device-tilt holo effect (booster cover, revealed card, history zoom), ported
// from AlteredOwnership's wwwroot/js/card-tilt.js (itself ported from altered-draft's
// useHoloTilt). Writes --own-tilt-x/-y (rotation) and --own-tilt-px/-py/--own-tilt-opacity
// (shine/glare position + visibility) as CSS custom properties on the attached element;
// assets/style.css's .own-tilt-card / .own-tilt-holo rules consume them.
window.OWN_CARD_TILT = (() => {
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const ensureHoloLayers = (el) => {
        if (el.querySelector(':scope > .own-tilt-shine')) return;
        const shine = document.createElement('div');
        shine.className = 'own-tilt-shine';
        const glare = document.createElement('div');
        glare.className = 'own-tilt-glare';
        el.append(shine, glare);
    };

    const setFromPercent = (el, px, py) => {
        el.style.setProperty('--own-tilt-px', px + '%');
        el.style.setProperty('--own-tilt-py', py + '%');
        el.style.setProperty('--own-tilt-y', (-((px - 50) / 3.5)) + 'deg');
        el.style.setProperty('--own-tilt-x', ((py - 50) / 3.5) + 'deg');
        el.style.setProperty('--own-tilt-opacity', '1');
    };

    const apply = (el, clientX, clientY) => {
        const rect = el.getBoundingClientRect();
        const px = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
        const py = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
        setFromPercent(el, px, py);
    };

    const reset = (el) => {
        el.style.setProperty('--own-tilt-px', '50%');
        el.style.setProperty('--own-tilt-py', '50%');
        el.style.setProperty('--own-tilt-x', '0deg');
        el.style.setProperty('--own-tilt-y', '0deg');
        el.style.setProperty('--own-tilt-opacity', '0');
    };

    // Phones without a mouse get the effect driven by device tilt instead.
    const orientationTargets = new Set();
    let orientationListening = false;
    const onOrientation = (e) => {
        if (e.beta == null || e.gamma == null) return;
        const x = clamp(e.gamma, -18, 18);
        const y = clamp(e.beta - 45, -18, 18);
        const px = ((x + 18) / 36) * 100;
        const py = ((y + 18) / 36) * 100;
        orientationTargets.forEach((el) => {
            el.style.setProperty('--own-tilt-px', px + '%');
            el.style.setProperty('--own-tilt-py', py + '%');
            el.style.setProperty('--own-tilt-x', (-x) + 'deg');
            el.style.setProperty('--own-tilt-y', y + 'deg');
            el.style.setProperty('--own-tilt-opacity', '1');
        });
    };
    const ensureOrientationListener = () => {
        if (orientationListening) return;
        orientationListening = true;
        window.addEventListener('deviceorientation', onOrientation);
    };

    const attach = (el, { holo = false } = {}) => {
        el.classList.toggle('own-tilt-holo', holo);
        if (holo) ensureHoloLayers(el);
        el.onpointermove = (e) => apply(el, e.clientX, e.clientY);
        el.onpointerleave = () => reset(el);
        orientationTargets.add(el);
        ensureOrientationListener();
    };

    const detach = (el) => {
        el.onpointermove = null;
        el.onpointerleave = null;
        orientationTargets.delete(el);
        el.classList.remove('own-tilt-holo');
        reset(el);
    };

    return { attach, detach, reset };
})();
