#!/bin/bash
# Web container entrypoint: apply pending DB migrations, then run Apache.
#
# Migrations are tracked in {prefix}schema_migrations and authored idempotently, so
# running bin/migrate.php on every start is safe and a no-op once up to date. The DB
# is expected reachable by now (compose: depends_on service_healthy; Aspire: WaitFor
# the DB resource). If migrations don't complete cleanly we still start Apache, so a
# transient hiccup doesn't crash-loop the site — the failure is logged for the dev.
set -e

echo "[entrypoint] applying DB migrations..."
if ! php /var/www/html/bin/migrate.php; then
    echo "[entrypoint] WARNING: migrations did not complete cleanly; starting Apache anyway." >&2
fi

exec apache2-foreground
