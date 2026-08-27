#!/usr/bin/env sh
# Loads the sample data into the running Fuseki dataset. The data-loader service in
# docker-compose.yml runs this on every start.
set -e

ENDPOINT="${FUSEKI_URL:-http://localhost:3030}/app"
RDF_DIR="${RDF_DIR:-$([ -d /rdf ] && echo /rdf || echo "$(dirname "$0")/../rdf")}"
AUTH="admin:${ADMIN_PASSWORD:-admin}"

echo "Waiting for Fuseki at $ENDPOINT"
for i in $(seq 1 30); do
  if curl -s -o /dev/null "$ENDPOINT/query?query=ASK%20%7B%7D"; then
    break
  fi
  sleep 1
done

for file in "$RDF_DIR"/*.ttl; do
  echo "Loading $file"
  curl -s -f -u "$AUTH" -X POST \
    -H 'Content-Type: text/turtle' \
    --data-binary "@$file" \
    "$ENDPOINT/data?default" > /dev/null
done

COUNT=$(curl -s -H 'Accept: application/sparql-results+json' \
  --data-urlencode 'query=SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }' \
  "$ENDPOINT/query" | grep -o '"value" *: *"[0-9]*"' | grep -o '[0-9]*')
echo "Loaded. Triples in dataset: $COUNT"
