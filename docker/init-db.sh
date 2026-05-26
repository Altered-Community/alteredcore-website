#!/bin/bash
# Substitutes {prefix} in schema.sql with DB_PREFIX, then imports it.
# DB_PREFIX is set in docker-compose.yml and must match config.local.php.
set -e
sed "s/{prefix}/${DB_PREFIX}/g" /tmp/schema-template.sql | \
    mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"
