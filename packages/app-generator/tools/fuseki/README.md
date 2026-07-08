# Development SPARQL Datasource

A local Fuseki triple store preloaded with data for the demo specifications. Generated
applications read from it and write to it (Create is implemented, Update and Delete are not yet).

## Usage

```sh
docker compose up -d
```

A data-loader service waits for Fuseki to become healthy and loads the data, so no separate
step is needed. The SPARQL endpoint for application graph datasources is the dataset root:

```
http://localhost:3030/app
```

The root endpoint answers both queries and updates, and this image leaves it open, so generated
apps read and write anonymously without credentials. The dedicated `/app/query` endpoint is
read only, and `/app/update` requires basic auth, so datasources point at the root rather than
those. Since LDKit issues an update to the same endpoint it reads from, one endpoint covers both.

The dataset is in memory. Restarting the container clears all data, and the data-loader reloads
it, which makes resets between test runs or user study participants cheap:

```sh
docker compose restart
```

`init-data.sh` loads every `*.ttl` file in `fixtures/`, so adding a new file needs no script
change. It can also be run by hand against a running container to reload after manual edits. The
web UI is available at `http://localhost:3030` (admin password `admin`).

## Fixtures

`fixtures/tourist-destinations.ttl` contains four destinations with contacts, matching the OFN
tourist destination test specification in `tests/fixtures/metadata/real-specification-source.json`.

`fixtures/application-graphs.ttl` contains instances of the application-graph meta-model: three
application graphs, their nodes and edges, two shared data sources, and codelist members. The
class and property IRIs come from the JSON-LD contexts Dataspecer generated for the demo
specification in `tmp/share/demo/jsonld`, so LDKit schemas generated from that specification
query exactly these terms. It exercises Czech diacritics, typed date and boolean literals,
missing optional values, shared references between graphs, and multi-level nesting through node
configurations.

Example checks:

```sh
# Instances per class.
curl -s --data-urlencode 'query=PREFIX ag: <https://dataspecer.com/vocabulary/application-graph#> SELECT ?class (COUNT(?s) AS ?n) WHERE { ?s a ?class } GROUP BY ?class ORDER BY ?class' \
  -H 'Accept: text/csv' http://localhost:3030/app/query

# One graph with its node and edge counts. Note the Czech predicate for the created timestamp.
curl -s --data-urlencode 'query=PREFIX ag: <https://dataspecer.com/vocabulary/application-graph#> SELECT ?name (COUNT(DISTINCT ?node) AS ?nodes) (COUNT(DISTINCT ?edge) AS ?edges) WHERE { ?g a ag:ApplicationGraph ; ag:name ?name ; ag:nodes ?node ; ag:edges ?edge } GROUP BY ?name' \
  -H 'Accept: text/csv' http://localhost:3030/app/query
```

`smoke-read.ts` reads the loaded application graphs through LDKit, including nested nodes, and
asserts the expected values. Run it against a running, loaded store:

```sh
npx tsx tools/fuseki/smoke-read.ts
```

## Verified LDKit schema shape

The LDKit schema is not the same as the JSON-LD context Dataspecer generates. `smoke-read.ts` is
the canonical worked example: it defines schemas for the loaded application graphs, reads them
including nested nodes, and asserts the results against the installed ldkit (2.x).

Version-specific facts that LDKit schema generation must respect for ldkit 2.x:

- Nested entities expand under the `@schema` key. The `@context` key is ignored by ldkit 2.x and
  leaves the property as a plain reference. This is the reverse of ldkit 1.x, where `@context`
  was the nested key. The generator targets the installed 2.x, so it must emit `@schema`.
- A reference property (an association without inline nested fields) carries only `@id` and
  resolves to the target IRI string. A JSON-LD `"@type": "@id"` is not an ldkit datatype, so
  schema generation must drop it for references.
- Other supported property keys are `@type` (an xsd datatype for literals), `@optional`,
  `@array`, `@multilang`, and `@inverse`.
- A missing optional value reads as `null`, not `undefined`.
- Generated read schemas mark fields optional so missing values do not hide existing resources.

CORS is enabled by default, so generated applications can query the endpoint directly from the
browser.
