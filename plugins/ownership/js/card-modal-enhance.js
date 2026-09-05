// Wires the 3D pointer-tilt/holo effect (card-tilt.js) and the single-family alt-art
// marker widget (alt-art-widget.js) onto a card-detail modal's card element. One shared
// component used by every modal implementation (core-altered-cards' card-search.js,
// _card-zoom-modal.php, and deckbuilder.php's openDbCardModal) so there is a single
// place to maintain and evolve this behavior instead of copy-pasting the wiring three
// times. Callers that don't have this script loaded (ownership integration inactive)
// simply append cardEl themselves instead of calling enhance() — see each call site.
(() => {
    // hostEl: the modal-inner container to append into (not yet containing cardEl).
    // cardEl: the already-built <altered-card> or plain <img>, not yet appended anywhere.
    // ref:    card reference string.
    // unique: whether this card is Unique-rarity (no alt-art family exists for uniques,
    //         and only unique cards get the holo variant of the tilt effect, matching
    //         the booster-reveal precedent in boosters.js).
    // cfg:    {enabled, altArtsUrl, cdnUrl, lang, markerImg, setPreferenceUrl, csrfToken,
    //         txt} — when falsy or cfg.enabled is false, the card still gets the 3D stage
    //         wrapper (so markup stays consistent) but no tilt/widget is attached.
    // Returns {destroy()} — call before clearing the modal's innerHTML on close.
    function enhance(hostEl, cardEl, ref, unique, cfg) {
        const stage = document.createElement('div');
        stage.className = 'own-tilt-stage';
        const tiltCard = document.createElement('div');
        tiltCard.className = 'own-tilt-card';
        tiltCard.appendChild(cardEl);
        stage.appendChild(tiltCard);
        hostEl.appendChild(stage);

        if (!cfg || !cfg.enabled) return { destroy() {} };

        let destroyed = false;
        let widgetRow = null;

        const tiltReady = unique ? window.OWN_CARD_TILT.waitForReady(tiltCard) : Promise.resolve();
        tiltReady.then(() => {
            if (destroyed) return;
            window.OWN_CARD_TILT.attach(tiltCard, { holo: unique });
        });

        if (!unique) {
            // Reserved synchronously (right after the stage, before anything the caller
            // appends afterward, e.g. a collection counter or "view detail" link) so the
            // widget lands directly under the card once its async fetch resolves, instead
            // of trailing behind whatever else the caller added in the meantime.
            const widgetSlot = document.createElement('div');
            widgetSlot.className = 'own-modal-alt-art mt-2';
            hostEl.appendChild(widgetSlot);

            window.OWN_ALT_ART_WIDGET.fetchSingleFamily(cfg.altArtsUrl, ref).then((res) => {
                if (destroyed || !res || !window.OWN_ALT_ART_WIDGET.hasRealChoice(res.optData)) return;
                widgetRow = window.OWN_ALT_ART_WIDGET.createFamilyRow(res.family, res.optData, cfg);
                widgetSlot.appendChild(widgetRow.el);
            });
        }

        return {
            destroy() {
                destroyed = true;
                window.OWN_CARD_TILT.detach(tiltCard);
                if (widgetRow) widgetRow.destroy();
            },
        };
    }

    window.OWN_CARD_MODAL_ENHANCE = { enhance };
})();
