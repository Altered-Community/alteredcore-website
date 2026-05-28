# Contributing to AlteredCore

## Quick start

```bash
git clone https://github.com/Altered-Community/alteredcore-website.git
cd alteredcore-website
git checkout dev
cp config.local.php.example config.local.php
docker compose up --build
```

The site runs at **http://localhost:8080**. phpMyAdmin is available at **http://localhost:8081**. The project folder is mounted into the container — file edits are served immediately without rebuilding.

Log in at **http://localhost:8080/admin** with `admin` / `admin` (pre-seeded — change the password before any public deployment).

---

## Branch model

| Branch | Role |
|---|---|
| `main` | Production-ready code. Deployed to the live server via FTP. Never committed to directly — only promoted from `dev` by a maintainer. |
| `dev` | Integration branch. All PRs from contributors target this branch. |

```
your fork / feature branch  →  PR  →  dev  →  PR  →  main
         (contributor)              (review)    (maintainer)
```

---

## Contributing a plugin (external developer)

Plugins are self-contained directories under `plugins/` and completely isolated from each other — you only touch your own folder.

### Workflow

1. **Fork** the repository on GitHub.
2. **Clone your fork** and check out `dev`:
   ```bash
   git clone https://github.com/YOUR_USERNAME/alteredcore-website.git
   cd alteredcore-website
   git checkout dev
   ```
3. **Create a branch** for your plugin:
   ```bash
   git checkout -b feature/plugin-my-plugin
   ```
4. **Build your plugin** inside `plugins/my-plugin/` — start from `plugins/hello-world/` or create a new folder with at minimum a `plugin.json`:
   ```json
   {
     "id": "my-plugin",
     "name": "My Plugin",
     "version": "1.0.0",
     "description": "What this plugin does.",
     "author": "Your name",
     "icon": "fa-puzzle-piece",
     "pages": [
       {
         "slug": "my-page",
         "file": "pages/index.php",
         "title_en": "My Page",
         "title_fr": "Ma Page"
       }
     ]
   }
   ```
5. **Test locally** — activate the plugin from the admin panel at **http://localhost:8080/admin/plugins**. No restart needed.
6. **Commit only your plugin folder:**
   ```bash
   git add plugins/my-plugin/
   git commit -m "my-plugin: short description"
   git push origin feature/plugin-my-plugin
   ```
7. **Open a Pull Request** from your branch targeting **`dev`** on the main repo.

Keep PRs focused on one plugin at a time. A plugin PR must not include changes to core files (`includes/`, `pages/`, `css/`, etc.) — open a separate PR for those.

See `plugins/plugin.schema.json` for all available manifest fields and `plugins/README.html` for the full plugin development reference.

---

## Contributing a core change (external developer)

For bug fixes or improvements to the core site (not a plugin):

1. Fork the repository, check out `dev`, create a branch:
   ```bash
   git checkout -b fix/my-fix
   ```
2. Make your changes, commit, push to your fork.
3. Open a Pull Request targeting **`dev`**.

---

## Promoting dev → main (maintainer only)

> **Never use a GitHub Pull Request to promote `dev` → `main`.** GitHub will immediately suggest a reverse PR to merge `main` back into `dev`, creating noise and potential merge pollution. Always use the command below.

When `dev` is tested and stable:

```bash
git push origin dev:main
# Then: git ftp push (see FTP deployment below)
```

---

## Code conventions

- **PHP 7.4 only.** The server runs PHP 7.4.
- **No framework, no Composer.** No build step, no external dependencies. The project is intentionally plain PHP — keep it that way.
- **Comments in English.**
- **CSS architecture — three levels.** (1) `css/style.css`: global site structure and shared components only — no plugin-specific or theme-specific rules. (2) `themes/*/style.css`: palette variables, layout variants, dark-mode overrides, glassmorphism effects, and plugin component *colour* overrides (only values that genuinely differ between themes). Never duplicate plugin structural rules in a theme file. (3) `plugins/*/assets/*.css`: all plugin-specific styles, including base layout, filter controls, and grid rules. Plugin CSS loads last and has the highest cascade priority.
- **Prefer plugins over core changes.** New features should go through the plugin system whenever possible. Only modify core files if the feature is genuinely site-wide infrastructure (auth, routing, theming). If it can live in a plugin, it should.
- **Keep it simple.** The goal is a site anyone can run on basic shared hosting — no root access, no CLI tools beyond PHP, just FTP and a database panel.

---

## License

This project is licensed under **GPL-3.0** with an attribution requirement. If you distribute or deploy a modified version, you must keep a visible credit to **PolluxTroy** in the interface — see [LICENSE.md](LICENSE.md).

---

## FTP deployment

Deployment uses **git-ftp**, which uploads only files that changed since the last deploy.

```bash
# Install (once)
sudo apt install git-ftp   # Debian/Ubuntu
brew install git-ftp       # macOS

# Store credentials in git config (once per machine — stored locally, never committed)
git config git-ftp.url      ftp://ftp.example.com/public_html/
git config git-ftp.user     ftpuser
git config git-ftp.password ftppassword

# First deploy from main
git checkout main
git ftp init

# Subsequent deploys (after promoting dev → main)
git ftp push
```

The `.git-ftp-ignore` file at the repository root lists **tracked files** that should never be uploaded to the server. Files already in `.gitignore` are not tracked by git and therefore invisible to git-ftp — no need to list them twice.

```
docker/
docker-compose.yml
Dockerfile
README.md
LICENSE.md
CONTRIBUTING.md
plugins/packages/
git-manager.py
```

If a plugin has its own instance-specific config, add it here too (e.g. `plugins/my-plugin/config.local.php`).

### Credentials

Store FTP credentials in the **local** git config (`.git/config` in your clone — never committed):

```bash
git config git-ftp.url      ftp://ftp.example.com/public_html/
git config git-ftp.user     ftpuser
git config git-ftp.password ftppassword
```

Never use `git config --global` for credentials — that would expose them to every repository on your machine. Alternatively, store them in `~/.netrc` (chmod 600) or pass them via the `GIT_FTP_USER` / `GIT_FTP_PASSWORD` environment variables (useful in CI pipelines).

### Multiple servers (scopes)

Use named scopes when you have more than one target (e.g. staging + production):

```bash
git config git-ftp.production.url      ftp://ftp.example.com/public_html/
git config git-ftp.production.user     ftpuser
git config git-ftp.production.password secret

git config git-ftp.staging.url      ftp://staging.example.com/public_html/
git config git-ftp.staging.user     ftpuser2
git config git-ftp.staging.password secret2

git ftp push --scope production
git ftp push --scope staging
git ftp init --scope staging    # first-time deploy to that scope
```

**Never run `git ftp init` on a live server** that already has config files — use `git ftp push`. The `init` command marks the current git state as deployed but does not overwrite server-only files.

Files not tracked in git (like `uploads/`) are never touched by git-ftp and are always preserved.

---

## Plugin documentation

`plugins/README.html` is the full plugin development reference: manifest format, pages, admin sections, API endpoints, database, helper functions, assets, and more. Open it in any browser — no server needed.
