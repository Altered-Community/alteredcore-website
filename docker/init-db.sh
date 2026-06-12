#!/bin/bash
# First-init only (runs from /docker-entrypoint-initdb.d on a fresh data volume):
#   1. Import schema.sql (substituting {prefix} with DB_PREFIX).
#   2. Create {prefix}schema_migrations and BASELINE every sql/migration_*.sql —
#      i.e. record them as applied WITHOUT running them. schema.sql already reflects
#      the current schema, so the migrations (which upgrade OLDER DBs) must not be
#      replayed here. Migrations added later are applied by sql/migrate.php against
#      the existing DB (see that script).
set -e

PREFIX="${DB_PREFIX}"
DB_ARGS="-u${MARIADB_USER} -p${MARIADB_PASSWORD} ${MARIADB_DATABASE}"

echo "[init-db] Importing schema.sql (prefix: ${PREFIX})..."
sed "s/{prefix}/${PREFIX}/g" /tmp/sql/schema.sql | mariadb ${DB_ARGS}

echo "[init-db] Creating ${PREFIX}schema_migrations and baselining existing migrations..."
mariadb ${DB_ARGS} <<SQL
CREATE TABLE IF NOT EXISTS \`${PREFIX}schema_migrations\` (
  filename VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL

for file in $(ls /tmp/sql/migration_*.sql 2>/dev/null | sort); do
    name="$(basename "${file}")"
    echo "[init-db] Baselining migration: ${name}"
    mariadb ${DB_ARGS} -e "INSERT IGNORE INTO \`${PREFIX}schema_migrations\` (filename) VALUES ('${name}');"
done

echo "[init-db] Done."
