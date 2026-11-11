# NKD source (Czech National Data Catalog)

Finds codelists in NKD and prefills the vocabulary form from them.

## Endpoint
`https://data.gov.cz/sparql`
- Virtuoso, queried with GET by `../sparql-client.ts` (30 s timeout, JSON results). It allows browser requests (CORS).
- The endpoint **rejects queries it estimates as too expensive**. 
    - Three per-language `OPTIONAL`s for the publisher name made the query fail for the biggest publisher (DIA), so the name is asked for with one `OPTIONAL` and the language is classified when the rows are merged. 
    - Big scans can also time out.
- **The whole catalogue is read once and listed locally** (`../catalogue.ts`): all 367 codelists with their titles (219 KB, 0.3 to 0.6 s) and the 7 publisher names (2 KB). Paging, counting, sorting and searching are done on client.

## What is a controlled vocabulary here

How datasets are filtered:
- `dcat:Dataset` with `dct:conformsTo` an IRI starting `https://ofn.gov.cz/číselníky` (the open formal norm (OFN) for codelists, any version)
- with a `dct:publisher`, and not a `dcat:DatasetSeries` (series have no distributions, their versions are listed as datasets themselves). 
- a controlled vocabulary can have multiple versions, all versions are listed

The group of a vocabulary is its `dct:publisher`, named by `foaf:name`.

Measured: **367 records, 7 publishers**, 149 records have `foaf:page`. Records per publisher: DIA 233, MŠMT 71, MPSV 44, Univerzita Karlova 12, TAČR 3, ČOI 3, ÚOHS 1.

## Distributions
The user does not choose a distribution: `chooseDistribution` (`detail.ts`) picks the best one.
- A distribution with `dcat:accessService` and no `downloadURL` is an endpoint, format `SPARQL`.
- Rank, best first: JSON-LD, Turtle, RDF/XML, TriG, N-Triples, N-Quads, RDFa, CSV, XML, JSON, then others, SPARQL last. Ties by IRI. So the OFN JSON-LD file is used when there is one, otherwise the best of the others. A distribution without any address is not chosen; a record with none gets the `noDistribution` warning.
- RDF formats and SPARQL carry SKOS (`conformsToSkos` true); CSV, XML, JSON, XLSX and others do not (false, and the vocabulary is then referenced by the file address).
- **Only JSON-LD is read** (`isReadableFormat`). Other formats only give the addresses.

## How metadata are derived (`metadata.ts`, `deriveMetadata`)
| Form field | From |
|---|---|
| Name | record `dct:title` in cs / en; untagged titles go under the UI language |
| Documentation | record `foaf:page` (only some records have it) |
| Distributions | `dcat:distribution` -> `dct:title`, `dct:format` (EU file-type IRI), `dcat:accessURL`, `dcat:downloadURL`, `dcat:accessService` |
| Access URL | distribution `downloadURL`, else `accessURL`; for a SPARQL endpoint the endpoint address |
| Download URL | same as access URL, `null` (checkbox off) for a SPARQL endpoint |
| `conformsToSkos` | by format, see above |
| Scheme IRI (`references`) | not in the record, only in the codelist file: root `iri` / `id` of the JSON-LD file; for a non-SKOS distribution the file address |
| Regex | not in the record either: longest common prefix of the item IRIs (`../iri-pattern.ts`), cut at the last `/` or `#`, escaped, `^….*$`; none for fewer than 2 items or a prefix that is only a host |
| Sample IRIs | first 5 distinct item IRIs, shown under the regex field |

The file is fetched from the browser **with no custom headers** (10 s timeout) because publishers allow cross-origin simple requests at best, and some (for example isvavai.cz) not at all. Any failure never blocks the form; it adds a warning: `fetchFailed` (network, CORS, HTTP status, timeout; `detail` has the reason), `notParsed`, `noSchemeIri`, `unsupportedFormat` (the best distribution is not JSON-LD but carries SKOS), `noDistribution` (the record has none). When the record itself cannot be loaded, the form gets only the name from the list and `recordNotLoaded` (`../sparql-source.ts`).

## JSON-LD variants (`ofn-jsonld.ts`)
- OFN release 2022-02-08 (DIA, MŠMT): `iri`, `název`, `položky[].iri`.
- Earlier draft (ISVaVaI): `id`, `název-číselníku`, `položky[].id`.
- No OFN context (MPSV): ASCII keys `polozky`, `nazev`, relative `id` resolved against `@base` (only when it ends with `/` or `#`).
- A byte order mark at the start of a file is stripped before `JSON.parse`.

## Known gaps
- A publisher without CORS gives the `fetchFailed` warning; the form is then filled by hand.
- Turtle, RDF/XML and other RDF files are not parsed.
- Versions of one codelist are separate list items.

