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
    // unique: whether this card is Unique-rarity — only affects the holo variant of the
    //         tilt effect (matching the booster-reveal precedent in boosters.js).
    //         The alt-art widget is NOT gated on this: Hero cards are also classified
    //         Unique-rarity but can still belong to a real multi-art family, so whether
    //         a family exists is left entirely to deck-alt-arts.php's response (a null
    //         group is what hides the widget — unlike the full Alt Arts BGA page, the
    //         modal still shows it even when the player owns only one illustration).
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

        // Reserved synchronously (right after the stage, before anything the caller
        // appends afterward, e.g. a collection counter or "view detail" link) so the
        // widget lands directly under the card once its async fetch resolves, instead
        // of trailing behind whatever else the caller added in the meantime.
        const widgetSlot = document.createElement('div');
        widgetSlot.className = 'own-modal-alt-art mt-2';
        hostEl.appendChild(widgetSlot);

        // Unlike the full Alt Arts BGA page's "Hide non-choices" filter, the modal always
        // shows the widget as soon as a multi-art family exists for this card — even when
        // the player only owns one illustration (no real choice to make yet), so the tile
        // strip itself communicates that fact (unowned prints render dimmed/unclickable)
        // rather than silently omitting the section.
        window.OWN_ALT_ART_WIDGET.fetchSingleFamily(cfg.altArtsUrl, ref).then((res) => {
            if (destroyed || !res) return;
            widgetRow = window.OWN_ALT_ART_WIDGET.createFamilyRow(res.family, res.optData, cfg);
            widgetSlot.appendChild(widgetRow.el);
        });

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
