# Sources of controlled vocabularies

Code behind "Add from source": it finds a vocabulary in a catalog, reads what it can about it and prefills the vocabulary form.
The UI is in `../components/source-wizard/`, its state in `../hooks/use-source-wizard.ts`. Nothing here depends on React.

**Sources**
- `nkd/` – Czech National Data Catalog. See [nkd/README.md](nkd/README.md).
- `eu/` – EU Vocabularies Reference Data Catalogue. See [eu/README.md](eu/README.md).

## Flow
source selection -> search or browse by group -> choose a distribution -> prefilled form (user checks, then Confirm).

## The contract (`types.ts`)
A source implements `VocabularySource`:
- `loadCatalogue()` – all the vocabularies of the source with their groups (publishers, creators), as a `Catalogue`. Read once and kept, so calling it again is instant; a failed reading is retried by the next call. It takes no `AbortSignal`, since the reading is shared.
- `getDetail(candidateId)` – titles, documentation URL and distributions, with the one to preselect.
- `getMetadata(detail, distributionId, options)` – the metadata for the form, plus warnings and sample IRIs. It must not fail for data it cannot read (it returns what is known with a warning); it fails only when cancelled.

`getDetail` and `getMetadata` take an `AbortSignal`; stale answers are dropped by the caller.

## Listing (`catalogue.ts`)
The catalogs are small (a few hundred vocabularies), so a source does not page, count or search on the endpoint. `createCatalogueLoader(read, { sortLanguage })` gives the source its `loadCatalogue` from two queries the source supplies:
- catalogue rows: `?dataset ?group ?title`, a row per title (`?title` missing for a vocabulary without one);
- group name rows: `?group ?name`, a row per name.

It merges them (`buildCatalogue`), sorts the vocabularies by their title in `sortLanguage` (others after, then by IRI), and counts and names the groups. The wizard loads the catalogue once (`useCatalogue`), filters it by group and by a case-insensitive substring of any loaded title (`filterCandidates`), and cuts the pages (`pageItems`, `PAGE_SIZE` in `../lib/paging.ts`). A source that has a catalog too big for this would need a paged listing in the contract.

## Rules the sources follow
- The queries run in the browser against public endpoints, so the endpoint must allow CORS. Virtuoso rejects queries it thinks are too expensive, and a cold endpoint takes seconds for even a simple query.
- The metadata never block the form: a source that cannot read something warns (`MetadataWarning`) and leaves the field to the user.

## Adding a source
1. Create `<name>/` with the four queries (catalogue rows, group names, record, distributions), `buildDetail`, `readMetadata` and a `README.md`.
2. Make the source with `createSparqlSource({ id, endpoint, sortLanguage, queries, buildDetail, readMetadata })` (`sparql-source.ts`), in a `create<Name>Source()` factory that takes `{ fetch }` for tests. It runs the queries, reads the catalogue once and calls `readMetadata` with `{ run, fetch }`, so a source uses whichever it needs (query the endpoint, load a file).
3. Map the rows of the distributions with `mapDistributions(rows, kindOf)` (`distributions.ts`): it merges the rows and works out the addresses, the source tells the format and whether the metadata can be read from it, and sorts the result. Other helpers for rows are in `sparql-utils.ts` (`firstValue`, `termsOf`, `toLanguageString`, `rankIn`), for file types in `file-types.ts`, for IRI patterns in `iri-pattern.ts`.
4. Add its descriptor (with `metadataDerivation` in English and Czech) and the source to `registry.ts`.
5. Test the mapping, validation and metadata with mocked `fetch`/`run` (`*.spec.ts`). Check each query live against the endpoint.
