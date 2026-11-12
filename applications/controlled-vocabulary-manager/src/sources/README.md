# Sources of controlled vocabularies

Code behind "Add from source": it finds a vocabulary in a catalog, reads what it can about it and prefills the vocabulary form.
The UI is in `../components/source-wizard/`, its state in `../hooks/use-source-wizard.ts`. Nothing here depends on React.

**Sources**
- `nkd/` – Czech National Data Catalog. See [nkd/README.md](nkd/README.md).
- `eu/` – EU Vocabularies Reference Data Catalogue. See [eu/README.md](eu/README.md).

## Flow
source selection -> search or browse by group -> choose a vocabulary (its metadata are read while the list waits) -> prefilled form with a note on how the metadata were derived (user checks, then Confirm). The source picks the best distribution itself; there is no screen for it.

## The contract (`types.ts`)
A source implements `VocabularySource`:
- `loadCatalogue()` – all the vocabularies of the source with their groups (publishers, creators), as a `Catalogue`. Read once and kept, so calling it again is instant; a failed reading is retried by the next call. It takes no `AbortSignal`, since the reading is shared.
- `readMetadata(candidate, options)` – reads the record and the best distribution of the chosen vocabulary and gives the metadata for the form, plus warnings and sample IRIs. It never fails for data it cannot read: it returns what is known with a warning (when even the record cannot be loaded, only the name from the listing with `recordNotLoaded`; a record without a distribution gets `noDistribution`). It fails only when cancelled, through the `AbortSignal` in `options`; the caller drops stale answers.

The explanation shown in the form of how a source derives the metadata is the `metadataDerivation` of its descriptor in `registry.ts` (English and Czech); it states what the source does and nothing more.

## Listing (`catalogue.ts`)
The catalogs are small (a few hundred vocabularies), so a source does not page, count or search on the endpoint. `createCatalogueLoader(read, { sortLanguage })` gives the source its `loadCatalogue` from two queries the source supplies:
- catalogue rows: `?dataset ?group ?title`, a row per title (`?title` missing for a vocabulary without one);
- group name rows: `?group ?name`, a row per name.

It merges them (`buildCatalogue`), sorts the vocabularies by their title in `sortLanguage` (others after, then by IRI), and counts and names the groups. The wizard loads the catalogue once (`useCatalogue`), filters it by group and by a case-insensitive substring of any loaded title (`filterCandidates`), and cuts the pages (`pageItems`, `PAGE_SIZE` in `../lib/paging.ts`). A source that has a catalog too big for this would need a paged listing in the contract.

## Rules the sources follow
- The queries run in the browser against public endpoints, so the endpoint must allow CORS. Virtuoso rejects queries it thinks are too expensive, and a cold endpoint takes seconds for even a simple query.
- The metadata never block the form: a source that cannot read something warns (`MetadataWarning`) and leaves the field to the user.

## Adding a source
1. Create `<name>/` with the four queries (catalogue rows, group names, record, distributions), a `chooseDistribution(rows)` that picks the best distribution of the record, a `buildRecord(recordRows, distributionRows)`, a `deriveMetadata(record, options, deps)` and a `README.md`.
2. Make the source with `createSparqlSource({ id, endpoint, sortLanguage, queries, deriveMetadata })` (`sparql-source.ts`), in a `create<Name>Source()` factory that takes `{ fetch }` for tests. It runs the queries, reads the catalogue once, and `readMetadata` runs the record and distributions queries, hands the rows to `deriveMetadata` with `{ run, fetch }` (so a source uses whichever it needs: query the endpoint, load a file) and answers `recordNotLoaded` when the queries fail.
3. Helpers for rows are in `sparql-utils.ts` (`firstValue`, `termsOf`, `groupRows`, `toLanguageString`, `rankIn`), for file types in `file-types.ts`, for IRI patterns in `iri-pattern.ts`.
4. Add its descriptor (with `metadataDerivation` in English and Czech) and the source to `registry.ts`.
5. Test the choice of the distribution, the mapping, validation and metadata with mocked `fetch`/`run` (`*.spec.ts`). Check each query live against the endpoint.
