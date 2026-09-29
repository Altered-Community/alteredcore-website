# Altered Re:Builder — plugin `rebuilder` du site AlteredCore (Angular)

## Produit

Section decks d'Altered Re:Builder (liste, page de deck, nouveau deck, éditeur), montée par le site sur
`/pages/rebuilder/` (build `embed`, Shadow DOM, contrat `window.AlteredCore` : voir `../README.md`). Sources
importées de [Yutsa/altered-re-builder](https://github.com/Yutsa/altered-re-builder), qui garde l'app autonome
(Capacitor, BFF d'authentification, maquettes, e2e autonomes). Les mêmes composants s'adaptent à la taille
d'écran et à la densité : pas d'écrans « mobile » et « desktop » séparés.

## Références de conception

- `design/COMPONENTS.md` : inventaire des composants `ar-*` et API attendue.
- `design/tokens/tokens.css` : seules valeurs autorisées pour couleurs, espacements, rayons, ombres, typo, hauteurs.
- Maquettes et captures de référence : dans le repo Re:Builder (`design/mockups/`, `design/screenshots/`).

## Règles de code

- Angular 22, zoneless (pas de `zone.js`), selon les bonnes pratiques officielles
  (https://angular.dev/assets/context/best-practices.md) :
  - Standalone et `OnPush` sont les défauts : ne jamais écrire `standalone: true` ni
    `changeDetection: ChangeDetectionStrategy.OnPush`. L'état change par signals, jamais en comptant sur une
    détection de changements globale.
  - Signals : `input()`, `output()`, `model()` pour le two-way binding, `computed()` pour l'état dérivé,
    `linkedSignal()` pour un état dérivé qui reste modifiable ; `set()` / `update()`. Observables dans les
    templates via le pipe `async`.
  - Services : `@Service()` (Angular 22), jamais `@Injectable({ providedIn: 'root' })` (ESLint
    `prefer-service-decorator`). Service fourni explicitement (`providers` d'un composant, `useClass`) :
    `@Service({ autoProvided: false })`. Classe abstraite avec implémentation par défaut :
    `@Service({ factory: () => inject(Impl) })`. `@Injectable` seulement quand la classe de base prend ses
    dépendances par constructeur (erreur NG2028, ex. `ShadowStylesHost`), avec un commentaire.
  - Dépendances par `inject()`, jamais par le constructeur (ESLint `prefer-inject`).
  - Pas de `@HostBinding` / `@HostListener` : objet `host` du décorateur. Pas de `ngClass` / `ngStyle` : bindings
    `[class.x]` / `[style.x]`. Pas de `CommonModule` : importer seulement les directives et pipes utilisés.
  - Control flow natif (`@if`, `@for`, `@switch`), templates simples, routes chargées à la demande
    (`loadComponent`). Variables de contexte de `@for` (`$index`, `$last`…) sans alias. Tout `@switch` a un
    `@default` ; sur une union, `@default never;` sur une variable `@let` (le compilateur ne restreint pas le
    type d'un appel de signal) pour vérifier que tous les cas sont traités.
  - Nouveaux formulaires : Signal Forms (`@angular/forms/signals`), sinon Reactive Forms.
  - Images statiques : `NgOptimizedImage` (`ngSrc`), sauf images en base64.
  - TypeScript strict, inférence quand le type est évident, `unknown` plutôt que `any`.
  - `eslint.config.js` impose ces règles (règles angular-eslint, linting typé) : corriger plutôt que désactiver,
    et toute désactivation locale porte un commentaire qui la justifie.
- Un composant par dossier, jamais de `template:` ni de `styles:` en ligne, même pour un petit composant (choix du
  projet, là où Angular suggère le template en ligne) : `<nom>/<nom>.ts` + `<nom>.html`
  (`templateUrl`) + `<nom>.scss` (`styleUrl`, seulement s'il y a des styles). Les fonctions `open…()` d'un overlay
  restent dans le `.ts` du composant ; types et helpers partagés entre plusieurs composants vont dans un fichier
  à part au niveau du groupe (ex. `ui/chips/rarity.ts`, `features/decks/deck-filters.ts`).
- Textes : sources en français, tout texte affiché (y compris `aria-label`, `title`, placeholders, messages d'erreur,
  titres d'overlay) marqué `i18n="@@zone.cle"` / `` $localize`:@@zone.cle:Texte` `` avec un id explicite, et sa
  traduction ajoutée à `src/locale/messages.en.json` (`npm run i18n:check`, lancé par `npm run lint`). Pluriels : ICU
  dans les templates, deux messages en TypeScript. `Intl` et `toLocale…` avec `uiLocale()` ; données de cartes avec
  `contentLocale()`.
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
- Accessibilité : passer les contrôles AXE et les minimums WCAG AA (focus, contrastes, ARIA). Vrais
  `<button>`/`<a>`/`<input>` avec label, `aria-label` sur les boutons icône, cibles ≥ 44 px en touch, focus visible.
- Icônes au trait : `ar-icon` (`src/app/ui/icon/icon.ts`, SVG Lucide en ligne : `lucide-angular` ne supporte pas encore
  Angular 22). Icônes de rareté et de terrain : `public/assets/icons/` (servies sous `assets/icons/`) ; gemmes, factions, terrains et logos d'extension : `public/assets/` (voir son `README.md`).
- Backend : **réutiliser les services, modèles et intercepteurs existants** pour les appels API. Ne pas dupliquer
  un client ; si un modèle ne correspond pas à l'UI, écrire un mapper plutôt que de modifier le contrat.
- Embarqué : pas d'accès direct au token Keycloak (session du site, appels decks par le relais
  `AlteredCore.services.decks`), styles et overlays dans le shadow root, menu du site à la place de `site-menu`.
- App autonome (Capacitor) : `env(safe-area-inset-*)` pour les zones sûres, `@capacitor/keyboard`, `@capacitor/status-bar`,
  bouton retour Android via `@capacitor/app` (ferme d'abord l'overlay ouvert).

## Vérification avant de terminer une tâche

1. `npm run build`, `npm run build:embed` et `ng lint` sans erreur, `npm test` vert.
2. E2E dans le site (`tests/e2e` + `plugins/rebuilder/e2e`) sur la stack `docker-compose.stack.yml` : voir
   `../README.md`.
3. Capture Playwright de l'écran embarqué à 1440×900 et 390×844.
4. Recherche de valeurs en dur (`#[0-9a-f]{3,6}`, `px` de hauteur de contrôle) hors `design/tokens/tokens.css`.

## Structure du repo

| Emplacement | Contenu |
|---|---|
| `design/` | `COMPONENTS.md` et tokens. |
| `design/tokens/tokens.css` | Tokens `--ar-*`, chargés globalement via `angular.json` → `styles`. |
| `src/styles.scss` | Base globale (reset, classes `ar-overlay-*` partagées par les contenus d'overlay). |
| `src/app/ui/` | Design system `ar-*`, un dossier par groupe avec un `index.ts` (barrel, à utiliser depuis les écrans) et un sous-dossier par composant : `buttons/`, `fields/` (champs, `ar-radio-card`), `chips/`, `containers/`, `nav/` (dont `ar-back-button` et `navigation-history.ts`), `metier/` (composants métier : tuiles de carte / héros, onglets de faction, sélecteur de héros…), `overlay/` (`ArOverlayService` dans `overlay.ts`, `overlay-container/`), `icon/` ; `layout.services.ts` (`ArBreakpointService`, `ArDensityService`). |
| `src/app/features/` | Écrans, un sous-dossier par composant (`decks-page/`, `import-deck/`…) : `home/` (accueil `/`), `cards/` (onglet Cartes `/cartes`), `search/` (recherche de cartes partagée par l'éditeur et Cartes : `card-search/`, filtres, résultats, `CardSearchStore`), `decks/` (Mes decks, `/decks/new`, import), `deck/` (consultation), `editor/` (édition), `login/`, `shared/` (overlays partagés : Nouveau deck, Choisir un héros, Réglages du deck ; menu du site `site-menu/`, `account-actions/`, `site-links.ts`), `ds/` (page `/_ds`). |
| `src/app/core/` | Services backend et logique : `cards-api.service.ts`, `decks-api.service.ts`, `auth.service.ts`, `guest-deck.service.ts` (mode invité, `localStorage`), `deck-store.ts`, modèles (`models.ts`), formats, règles de deck. |
| `src/app/app.routes.ts` | Routes de l'app autonome, dont `/_ds` : catalogue vivant du design system (`src/app/features/ds/`). |
| `src/main.embed.ts`, `src/app/embed/` | Mode embarqué : lecture de `window.AlteredCore`, routes de la section decks, session du site, overlays et styles dans le shadow root. |
| `src/embed/` | Styles du build embarqué (shadow root, et `<head>` pour les polices). |
| `scripts/embed-manifest.mjs` | Écrit `../dist/embed-manifest.json` (fichiers chargés par le site) après `ng build --configuration embed`. |
| `../e2e/` | Scénarios Playwright du plugin, lancés par le site sur la stack complète (desktop 1440×900 et mobile 390×844). |
| `docs/backend-api.md` | Contrat des API consommées. |
| `docs/api-limitations/` | Manques des API, contournements côté front et corrections backend à faire (un fichier par API). |

Commandes npm :

| Commande | Rôle |
|---|---|
| `npm start` | `ng serve` sur `0.0.0.0:4200`. |
| `npm run build` | Build de production de l'app autonome. |
| `npm run build:embed` | Build embarqué → `../dist/browser` + `../dist/embed-manifest.json` (ce que le site sert). |
| `npm test` | Tests unitaires (Vitest via `@angular/build:unit-test`, fichiers `*.spec.ts`). |
| `ng lint` | ESLint (`angular-eslint`, configuration `eslint.config.js`). |


## Comportement

Lorsque tu répond à l'utilisateur après avoir terminé une tâche de code, montre toujours le résultat sous forme de screenshot si c'est visuel, ou bien de la manière aproprié si ce n'est pas visuel.

Propose toujours un lien vers l'application pour que l'utilsateur puisse vérifier lui même le travail également.