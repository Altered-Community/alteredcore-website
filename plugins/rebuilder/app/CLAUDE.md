# Altered Re:Builder — éditeur de deck (Angular + Capacitor)

## Produit

Éditeur et consultation de decks pour le jeu de cartes Altered. **Une seule codebase** : web desktop, web mobile
et app mobile via Capacitor. Pas d'écrans « mobile » et « desktop » séparés : les mêmes composants s'adaptent
selon la taille d'écran et la densité.

## Références de conception

- `design/README.md` : index des écrans, navigation, décisions de conception à respecter.
- `design/mockups/*.dc.html` : source de vérité des mesures (HTML + styles en ligne). Toujours lire la maquette
  de l'écran concerné avant de l'implémenter, et comparer le rendu à `design/screenshots/<écran>.png`.
- `design/COMPONENTS.md` : inventaire des composants `ar-*` et API attendue.
- `design/tokens/tokens.css` : seules valeurs autorisées pour couleurs, espacements, rayons, ombres, typo, hauteurs.
- `design/IMPLEMENTATION-PLAN.md` : ordre des étapes.

## Règles de code

- Angular moderne : composants standalone, `OnPush`, signals (`input()`, `output()`, `model()`, `computed()`),
  nouveau control flow (`@if`, `@for`). S'aligner sur la version et les conventions déjà présentes dans le repo.
- Un composant par dossier, jamais de `template:` ni de `styles:` en ligne : `<nom>/<nom>.ts` + `<nom>.html`
  (`templateUrl`) + `<nom>.scss` (`styleUrl`, seulement s'il y a des styles). Les fonctions `open…()` d'un overlay
  restent dans le `.ts` du composant ; types et helpers partagés entre plusieurs composants vont dans un fichier
  à part au niveau du groupe (ex. `ui/chips/rarity.ts`, `features/decks/deck-filters.ts`).
- Design system sous le préfixe `ar-`. Un écran n'utilise que des composants `ar-*` et du layout ; s'il manque un
  composant, l'ajouter au design system (et à la page `/_ds`) avant de l'utiliser.
- Tout composant `ar-*` ajouté ou modifié met à jour `design/COMPONENTS.md` et la page `/_ds`
  (`src/app/features/ds/`).
- Styles : aucune valeur en dur. Couleurs, rayons, ombres, espacements via `var(--ar-*)` ; hauteurs de contrôle
  via `--ar-control-sm|md|lg` (elles changent avec `data-density`).
- Responsive : `ArBreakpointService` (compact < 768, medium 768–1199, expanded ≥ 1200) et `ArDensityService`
  (`data-density="pointer|touch"` sur `<html>`). Overlays via `ArOverlayService` (fenêtre ≥ 768 px, feuille en dessous).
  Jamais une fenêtre ouverte par-dessus une autre : depuis un contenu d'overlay, ouvrir l'écran suivant comme étape
  (`ref.openStep(...)`, même fenêtre, flèche retour).
- Accessibilité : vrais `<button>`/`<a>`/`<input>` avec label, `aria-label` sur les boutons icône, cibles ≥ 44 px en touch,
  focus visible.
- Icônes au trait : `ar-icon` (`src/app/ui/icon/icon.ts`, SVG Lucide en ligne : `lucide-angular` ne supporte pas encore
  Angular 22). Icônes de rareté et de terrain : `public/assets/icons/` (servies sous `assets/icons/`, copiées depuis
  `design/assets/icons/`) ; gemmes, factions, terrains et logos d'extension : `public/assets/` (voir son `README.md`).
- Backend : **réutiliser les services, modèles et intercepteurs existants** pour les appels API. Ne pas dupliquer
  un client ; si un modèle ne correspond pas à l'UI, écrire un mapper plutôt que de modifier le contrat.
- Capacitor : `env(safe-area-inset-*)` pour les zones sûres, `@capacitor/keyboard`, `@capacitor/status-bar`,
  bouton retour Android via `@capacitor/app` (ferme d'abord l'overlay ouvert).

## Vérification avant de terminer une tâche

1. `npm run build` et `ng lint` sans erreur, `npm test` et `npm run e2e` verts.
2. Capture Playwright de l'écran à 1440×900 et 390×844, comparée à la capture de `design/screenshots/`.
3. Recherche de valeurs en dur (`#[0-9a-f]{3,6}`, `px` de hauteur de contrôle) hors `design/tokens/tokens.css`.

## Structure du repo

| Emplacement | Contenu |
|---|---|
| `design/` | Référence visuelle : maquettes, captures, tokens, `COMPONENTS.md`, `features/` (évolutions validées). |
| `design/tokens/tokens.css` | Tokens `--ar-*`, chargés globalement via `angular.json` → `styles`. |
| `src/styles.scss` | Base globale (reset, classes `ar-overlay-*` partagées par les contenus d'overlay). |
| `src/app/ui/` | Design system `ar-*`, un dossier par groupe avec un `index.ts` (barrel, à utiliser depuis les écrans) et un sous-dossier par composant : `buttons/`, `fields/` (champs, `ar-radio-card`), `chips/`, `containers/`, `nav/` (dont `ar-back-button` et `navigation-history.ts`), `metier/` (composants métier : tuiles de carte / héros, onglets de faction, sélecteur de héros…), `overlay/` (`ArOverlayService` dans `overlay.ts`, `overlay-container/`), `icon/` ; `layout.services.ts` (`ArBreakpointService`, `ArDensityService`). |
| `src/app/features/` | Écrans, un sous-dossier par composant (`decks-page/`, `import-deck/`…) : `home/` (accueil `/`), `cards/` (onglet Cartes `/cartes`), `search/` (recherche de cartes partagée par l'éditeur et Cartes : `card-search/`, filtres, résultats, `CardSearchStore`), `decks/` (Mes decks, `/decks/new`, import), `deck/` (consultation), `editor/` (édition), `login/`, `shared/` (overlays partagés : Nouveau deck, Choisir un héros, Réglages du deck ; menu du site `site-menu/`, `account-actions/`, `site-links.ts`), `ds/` (page `/_ds`). |
| `src/app/core/` | Services backend et logique : `cards-api.service.ts`, `decks-api.service.ts`, `auth.service.ts`, `guest-deck.service.ts` (mode invité, `localStorage`), `deck-store.ts`, modèles (`models.ts`), formats, règles de deck. |
| `src/app/app.routes.ts` | Routes, dont `/_ds` : catalogue vivant du design system (`src/app/features/ds/`). |
| `e2e/` | Scénarios Playwright (`playwright.config.ts` : projets `desktop` 1440×900 et `mobile` 390×844), contre les API de production. |
| `android/` | Projet Capacitor Android (`capacitor.config.ts`). |
| `docs/backend-api.md` | Contrat des API consommées. |
| `docs/api-limitations/` | Manques des API, contournements côté front et corrections backend à faire (un fichier par API). |

Commandes npm :

| Commande | Rôle |
|---|---|
| `npm start` | `ng serve` sur `0.0.0.0:4200`. |
| `npm run build` | Build de production (`dist/`). |
| `npm test` | Tests unitaires (Vitest via `@angular/build:unit-test`, fichiers `*.spec.ts`). |
| `npm run e2e` | Playwright (démarre `ng serve` si aucun serveur ne tourne sur le port 4200 ; `E2E_PORT` pour en changer). |
| `npm run cap:sync` | Build puis `npx cap sync` vers `android/`. |
| `ng lint` | ESLint (`angular-eslint`, configuration `eslint.config.js`). |


## Comportement

Lorsque tu répond à l'utilisateur après avoir terminé une tâche de code, montre toujours le résultat sous forme de screenshot si c'est visuel, ou bien de la manière aproprié si ce n'est pas visuel.

Propose toujours un lien vers l'application pour que l'utilsateur puisse vérifier lui même le travail également.