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

## Plugins

Drop a plugin folder into `plugins/` and activate it from the admin panel. See `plugins/hello-world/` for a minimal example and `plugins/README.html` for full documentation.

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the branch model, plugin workflow, code conventions, and FTP deployment.

PRs are welcome — target the `dev` branch, not `main`.

---

## License

Licensed under **GPL-3.0** with an attribution requirement — see [LICENSE.md](LICENSE.md).  
Forks and modifications are welcome; derivative works must credit **PolluxTroy** visibly.
