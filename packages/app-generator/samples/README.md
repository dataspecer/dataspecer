# Samples

Example specifications and the RDF data they describe, so a working application can be generated
without modeling it first.

```
specifications/   data to be imported into Dataspecer
rdf/              sample RDF data
fuseki/           local SPARQL store that serves data from rdf/
customizations/   optional code used by a particular example
```

| Example             | Data                     | Description                                                                                                                |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `book-library`      | `book-library.ttl`       | Showcases primitive fields, references, compositions, and specializations.                                                 |
| `application-graph` | `application-graphs.ttl` | The application graph model itself. The generated app edits application graphs stored as RDF, including a copy of its own. |
| `nkod`              | `nkod-dump-small.ttl`    | An example of a real specification over Czech open data.                                                                   |

Optional customizations show how the generated action slots are used:

- [Book Library](customizations/book-library/README.md) logs data from list, row, and detail actions.
- [Application graph](customizations/application-graph/README.md) exports the stored graph or
  generates its application.

## 1. Start the store

Run in this folder (`packages/app-generator/samples/`):

```sh
docker compose -f fuseki/docker-compose.yml up -d
```

Fuseki comes up on port 3030 and loads every `*.ttl` in `rdf/`. You can inspect and query the data
at http://localhost:3030/#/dataset/app/query (admin password `admin`).

The dataset is in memory. To restore the data, run `docker compose -f fuseki/docker-compose.yml restart`.

## 2. Import an example

In the Dataspecer manager, import one of the zips from `specifications/`. Each ZIP contains the
corresponding vocabulary, data structures, and application graph

## 3. Generate

Open the package's application graph in the application graph editor and press **Generate application**.
The editor downloads the app and tells you how to run it.
