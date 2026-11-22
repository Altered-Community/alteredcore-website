#!/bin/bash
# docker-compose.ownership.yml: the AlteredOwnership service only answers tokens with the `read-collection` scope.
# Adds it to the stack's realm as a default scope of the site's client (main-site), once.
set -euo pipefail
kc=/opt/keycloak/bin/kcadm.sh
$kc config credentials --server http://auth.altered.local.gd:18080 --realm master --user admin --password admin >/dev/null

# The image has no awk nor grep: bash reads the CSV.
scope=
while IFS=, read -r id name; do
  if [ "$name" = read-collection ]; then scope=$id; fi
done < <($kc get client-scopes -r players --fields id,name --format csv --noquotes)
if [ -z "$scope" ]; then
  scope=$($kc create client-scopes -r players -i -s name=read-collection -s protocol=openid-connect \
    -s 'attributes."include.in.token.scope"=true' -s 'attributes."display.on.consent.screen"=false')
fi
client=$($kc get clients -r players -q clientId=main-site --fields id --format csv --noquotes)
$kc update "clients/$client/default-client-scopes/$scope" -r players
echo "read-collection is a default scope of main-site"
