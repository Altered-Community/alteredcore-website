#!/bin/bash
# 1. Import schema.sql (substituting {prefix} with DB_PREFIX).
# 2. Run any migrate_NNN_*.sql files in sql/ in alphabetical order.
set -e

PREFIX="${DB_PREFIX}"
DB_ARGS="-u${MARIADB_USER} -p${MARIADB_PASSWORD} ${MARIADB_DATABASE}"

echo "[init-db] Importing schema.sql (prefix: ${PREFIX})..."
sed "s/{prefix}/${PREFIX}/g" /tmp/sql/schema.sql | mariadb ${DB_ARGS}

# Run migration files in sorted order (migrate_001_*.sql, migrate_002_*.sql, ...)
for file in $(ls /tmp/sql/migrate_*.sql 2>/dev/null | sort); do
    echo "[init-db] Running migration: $(basename ${file})..."
    sed "s/{prefix}/${PREFIX}/g" "${file}" | mariadb ${DB_ARGS}
done

echo "[init-db] Done."
