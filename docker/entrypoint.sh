#!/bin/bash
# Web container entrypoint: apply pending DB migrations, then run Apache.
#
# Migrations are tracked in {prefix}schema_migrations and authored idempotently, so
# running sql/migrate.php on every start is safe and a no-op once up to date. The DB
# is expected reachable by now (compose: depends_on service_healthy; Aspire: WaitFor
# the DB resource). If migrations don't complete cleanly we still start Apache, so a
# transient hiccup doesn't crash-loop the site — the failure is logged for the dev.
set -e

echo "[entrypoint] applying DB migrations..."
if ! php /var/www/html/sql/migrate.php; then
    echo "[entrypoint] WARNING: migrations did not complete cleanly; starting Apache anyway." >&2
fi

# Local / CI stack only: production menu, site name and logo (once), before plugins add theirs,
# and public decks for the community lists.
if [ "${AC_STACK_SEED:-}" = "1" ]; then
    php /var/www/html/docker/stack/seed.php || echo "[entrypoint] WARNING: stack seed failed." >&2
    php /var/www/html/docker/stack/seed-decks.php || echo "[entrypoint] WARNING: community decks seed failed." >&2
fi

# Local stack, opt-in: public content of production (news, pages, settings, images), once.
if [ "${AC_STACK_MIRROR:-}" = "1" ]; then
    php /var/www/html/docker/stack/mirror-prod.php || echo "[entrypoint] WARNING: production mirror failed." >&2
fi

# Optional (local / CI stack): activate plugins listed in AC_ACTIVATE_PLUGINS, like the admin
# "Activate" button (idempotent; also adds their suggested menu entries once).
if [ -n "${AC_ACTIVATE_PLUGINS:-}" ]; then
    echo "[entrypoint] activating plugins: ${AC_ACTIVATE_PLUGINS}"
    # shellcheck disable=SC2086
    php /var/www/html/bin/plugins.php activate ${AC_ACTIVATE_PLUGINS} \
        || echo "[entrypoint] WARNING: plugin activation failed." >&2
fi

exec apache2-foreground
