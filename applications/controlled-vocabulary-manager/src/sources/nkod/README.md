# NKOD source (Czech National Open Data Catalog)

Finds codelists in NKOD and prefills the vocabulary form from them. Read this before changing a query or the metadata rules.

## Endpoint
- `https://data.gov.cz/sparql`, Virtuoso, queried with GET by `../sparql-client.ts` (30 s timeout, JSON results). It allows browser requests (CORS).
- The endpoint **rejects queries it estimates as too expensive** (error 42000, "estimated execution time exceeds the limit"). Three per-language `OPTIONAL`s for the publisher name made the query fail for the biggest publisher (DIA), so the name is asked for with one `OPTIONAL` and the language is classified when the rows are merged. Big scans can also time out (504).
- **The whole catalogue is read once and listed locally** (`../catalogue.ts`): all 367 codelists with their titles (219 KB, 0.3 to 0.6 s) and the 7 publisher names (2 KB). Paging, counting, sorting and searching used to be queried per page; now they are instant after the first request.

## What is a vocabulary here
A `dcat:Dataset` with `dct:conformsTo` an IRI starting `https://ofn.gov.cz/číselníky` (the open formal norm, OFN, for codelists, any version), with a `dct:publisher`, and not a `dcat:DatasetSeries` (series have no distributions; their versions are listed as datasets themselves). All versions are listed, nothing is collapsed.
Measured: **367 records, 7 publishers**, 149 records have `foaf:page`. Records per publisher: DIA 233, MŠMT 71, MPSV 44, Univerzita Karlova 12, TAČR 3, ČOI 3, ÚOHS 1.

`dct:conformsTo` is shared by nearly all codelists (generic OFN IRIs such as `https://ofn.gov.cz/číselníky/2022-02-08/`), so it is **not** a per-vocabulary documentation link and is not used for it.

## Record structure used
| Need | Property |
|---|---|
| Title | `dct:title`, cs / en / untagged |
| Group | `dct:publisher` -> `foaf:name` |
| Documentation | `foaf:page` (only some records) |
| Distributions | `dcat:distribution` -> `dct:title`, `dct:format` (EU file-type IRI), `dcat:accessURL`, `dcat:downloadURL`, `dcat:accessService` |

The record does **not** contain the scheme IRI or the IRIs of the values. They are only in the codelist file.

## Files
- `listing.ts` – the two queries that read the catalogue (`catalogueQuery`, `groupNamesQuery`). The rest of the listing is the shared `../catalogue.ts`: sorted by Czech title (English-only ones after), publishers by size, search is a case-insensitive substring over the Czech and English titles.
- `detail.ts` – record query (titles, `foaf:page`) and distributions query; `buildDetail` merges rows, drops distributions without any address, ranks them.
- `distribution.ts` – format names from file-type IRIs (shared `../file-types.ts`), `carriesSkos`, `isReadableFormat`, `formatRank`.
- `ofn-jsonld.ts` – parser of the OFN JSON-LD codelist file.
- `metadata.ts` – `readMetadata`: fetches and parses the file, builds the form values and warnings.
- `nkod-source.ts` – wires it into `VocabularySource` (`NKOD_SPARQL_ENDPOINT`) with `createCatalogueListing`.

## Distributions
- A distribution with `dcat:accessService` and no `downloadURL` is an endpoint, format `SPARQL`.
- Default preselection (rank): JSON-LD, Turtle, RDF/XML, TriG, N-Triples, N-Quads, RDFa, CSV, XML, JSON, then others, SPARQL last. Ties by IRI.
- RDF formats and SPARQL carry SKOS (`conformsToSkos` true); CSV, XML, JSON, XLSX and others do not (false, and the vocabulary is then referenced by the file address).
- **Only JSON-LD is read** (`readable`). Other formats only give the addresses.

## How metadata are derived (`metadata.ts`)
| Form field | From |
|---|---|
| Name | record titles; untagged titles go under the UI language |
| Documentation | `foaf:page` |
| Access URL | distribution `downloadURL`, else `accessURL`; for a SPARQL endpoint the endpoint address |
| Download URL | same as access URL, `null` (checkbox off) for a SPARQL endpoint |
| `conformsToSkos` | by format, see above |
| Scheme IRI (`references`) | root `iri` / `id` of the JSON-LD file; for a non-SKOS distribution the file address |
| Regex | longest common prefix of the item IRIs (`../iri-pattern.ts`), cut at the last `/` or `#`, escaped, `^….*$`; none for fewer than 2 items or a prefix that is only a host |
| Sample IRIs | first 5 distinct item IRIs, shown under the regex field |

The file is fetched from the browser **with no custom headers** (10 s timeout) because publishers allow cross-origin simple requests at best, and some (for example isvavai.cz) not at all. Any failure never blocks the form; it adds a warning: `fetchFailed` (network, CORS, HTTP status, timeout; `detail` has the reason), `notParsed`, `noSchemeIri`, `unsupportedFormat` (non-JSON-LD distribution chosen).

## JSON-LD variants (`ofn-jsonld.ts`)
- OFN release 2022-02-08 (DIA, MŠMT): `iri`, `název`, `položky[].iri`.
- Earlier draft (ISVaVaI): `id`, `název-číselníku`, `položky[].id`.
- No OFN context (MPSV): ASCII keys `polozky`, `nazev`, relative `id` resolved against `@base` (only when it ends with `/` or `#`).
- A byte order mark at the start of a file is stripped before `JSON.parse`.

## Known gaps
- A publisher without CORS gives the `fetchFailed` warning; the form is then filled by hand.
- Turtle, RDF/XML and other RDF files are not parsed.
- Versions of one codelist are separate list items.

## Adding or fixing
- Shared helpers (escaping, IRI check, language strings): `../sparql-utils.ts`. Contract: `../types.ts`. Registration and the text told to the user about derivation: `../registry.ts`.
- Check every query live before wiring it (watch the cost limit), and do not unit-test query text: test mapping, escaping and validation.
