# AlteredCore 

Unofficial community website for the [Altered TCG](https://www.altered.gg/) card game.

Built with plain PHP — no framework, no build step, no Composer. Runs on any standard shared hosting with Apache and PHP 7.4.

---

## Philosophy

This project runs on plain PHP, plain SQL, and nothing else — no framework, no build step, no package manager. That is a deliberate choice, not a technical limitation. The goal is that any community member can deploy, fork, or contribute without specialized infrastructure or server access beyond a standard shared hosting plan.

Pull requests that introduce external dependencies or non-standard server requirements go against this principle and will not be merged.

---

## Requirements

- Apache with `mod_rewrite` enabled
- PHP 7.4
- MariaDB 10.x

---

## Quick start (Docker)

```bash
git clone https://github.com/Altered-Community/alteredcore-website.git
cd alteredcore-website
cp config.local.php.example config.local.php
docker compose up --build
```

Site available at **http://localhost:8080**. phpMyAdmin at **http://localhost:8081**. The demo admin account is `admin` / `admin` — change it before any public deployment.

To reset the database: `docker compose down -v && docker compose up`

---

## Manual installation (shared hosting)

**1. Configure** — copy the example and fill in your values:

```bash
cp config.local.php.example config.local.php
```

`config.php` is tracked in git — no copy needed. Set at minimum your DB credentials in `config.local.php`.

**2. Import the schema** — substitute `{prefix}` with your chosen prefix (or empty) before import:

```bash
sed 's/{prefix}//g' sql/schema.sql | mariadb -u alteredcore -p alteredcore
```

**3. Log in** — the schema seeds a default admin account: `admin` / `admin`. Change the password immediately from the admin panel.

**4. Apache** — `mod_rewrite` must be enabled and `AllowOverride All` set. If the site runs in a subdirectory, set `BASE_URL` in `config.local.php`:

```php
define('BASE_URL', '/alteredcore'); // leave empty if at domain root
```

---

## Authentication

**Local auth (default)** — email + password, no external dependency. Leave `KC_URL` empty.

**Keycloak** — SSO via a Keycloak server. Fill in `KC_URL`, `KC_REALM`, `KC_CLIENT_ID`, `KC_CLIENT_SECRET`, and `ENCRYPTION_KEY`.

---

## Optional features

| Feature | Config key |
|---|---|
| Rich text editor | `TINYMCE_API_KEY` — free key at [tiny.cloud](https://www.tiny.cloud/) |
| Card collection tracking | `COLLECTION_MODE` |
| Community feedback form | `GITHUB_APP_*` — requires a GitHub App |

---

## Design system

One look for the shell, the core pages and every plugin (PHP or SPA): `design-system/` holds the
tokens (light and dark themes, pointer and touch densities), the `ac-*` components, Lucide icons,
the Bootstrap bridge and the docs. Plain CSS, no build. Reference page: `/pages/design-system`.
Start with [design-system/README.md](design-system/README.md); designing with Claude Code and
Claude Design: [design-system/WORKFLOW.md](design-system/WORKFLOW.md).

---

## Plugins

Drop a plugin folder into `plugins/` and activate it from the admin panel. See `plugins/hello-world/` for a minimal example and `plugins/README.html` for full documentation.

The core stays build-free. Front-end plugins (manifest v2, `"type": "spa"`, e.g. `plugins/rebuilder`) are the exception: their bundle is built by CI and by the deploy workflow (`php bin/plugins.php`), never committed.

### Full stack (Keycloak, decks API, SPA plugins)

```bash
(cd plugins/rebuilder/app && nvm use && npm ci && npm run build)
docker compose -f docker-compose.yml -f docker-compose.stack.yml up -d --build --wait
```

Site on http://localhost:8080 (`WEB_PORT` to change it), Keycloak users `alice` / `bob` (password `TestPassword1234`), decks API on http://localhost:8001. Playwright: `cd tests/e2e && npm ci && npx playwright test`. CI runs the same on every pull request (`.github/workflows/plugins-ci.yml`).

**Like production.** To get the plugins active on https://altered.re and its public content (news, content pages, side menu, footer, fonts, logo, home page text, images):

```bash
AC_STACK_MIRROR=1 AC_ACTIVATE_PLUGINS="card-scan core-altered-cards equinox-deck-import ownership reunion-events tournament-reports rebuilder" \
  docker compose -f docker-compose.yml -f docker-compose.stack.yml up -d --build --wait
```

The copy runs once (`docker/stack/mirror-prod.php`); copy again with `docker compose -f docker-compose.yml -f docker-compose.stack.yml exec web php docker/stack/mirror-prod.php --force`, or from preprod with `--source=https://website-preprod.altered.re`. It reads the public pages only: users, plugin data and plugin settings stay local.

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the branch model, plugin workflow, code conventions, and FTP deployment.

PRs are welcome — target the `dev` branch, not `main`.

---

## License

Licensed under **GPL-3.0** with an attribution requirement — see [LICENSE.md](LICENSE.md).  
Forks and modifications are welcome; derivative works must credit **PolluxTroy** visibly.
