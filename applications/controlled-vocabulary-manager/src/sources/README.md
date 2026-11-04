# Sources of controlled vocabularies

Code behind "Add from source": it finds a vocabulary in a catalog, reads what it can about it and prefills the vocabulary form.
The UI is in `../components/source-wizard/`, its state in `../hooks/use-source-wizard.ts`. Nothing here depends on React.

**Sources**
- `nkod/` – Czech National Open Data Catalog. See [nkod/README.md](nkod/README.md).
- `eu/` – EU Vocabularies Reference Data Catalogue. See [eu/README.md](eu/README.md).

## Flow
source selection -> search or browse by group -> choose a distribution -> prefilled form (user checks, then Confirm).

## The contract (`types.ts`)
A source implements `VocabularySource`:
- `listGroups?(page)` – groups to browse by (publishers, creators). Optional.
- `listCandidates(filter, page)` – vocabularies, filtered by group and/or name text. Paged (`PageRequest`, `PAGE_SIZE` = 20); the total is the size of the whole listing.
- `getDetail(candidateId)` – titles, documentation URL and distributions, with the one to preselect.
- `getMetadata(detail, distributionId, options)` – the metadata for the form, plus warnings and sample IRIs. It must not fail for data it cannot read (it returns what is known with a warning); it fails only when cancelled.

Every request takes an `AbortSignal`; stale answers are dropped by the caller.


## Listing (`catalogue.ts`)
The catalogs are small (a few hundred vocabularies), so a source does not page, count or search on the endpoint. `createCatalogueListing(read, { sortLanguage })` builds `listGroups` and `listCandidates` from two queries the source supplies, read once and kept for the session (also when listings start at once or the first one is cancelled; a failed reading is retried by the next listing):
- catalogue rows: `?dataset ?group ?title`, a row per title (`?title` missing for a vocabulary without one);
- group name rows: `?group ?name`, a row per name.

It merges them, sorts the vocabularies by their title in `sortLanguage` (others after, then by IRI), counts and names the groups, filters by group and by a case-insensitive substring of any loaded title, and cuts the page. A source that has a catalog too big for this would need its own paged listing (the contract allows it).

## Rules the sources follow
- The queries run in the browser against public endpoints, so the endpoint must allow CORS. Virtuoso rejects queries it thinks are too expensive, and a cold endpoint takes seconds for even a simple query.
- The metadata never block the form: a source that cannot read something warns (`MetadataWarning`) and leaves the field to the user.

## Adding a source
1. Create `<name>/` with the listing, detail and metadata code, a `create<Name>Source()` factory and a `README.md`.
2. Add its descriptor (with `metadataDerivation` in English and Czech) and the source to `registry.ts`.
3. Test the mapping, validation and metadata with mocked `fetch`/`run` (`*.spec.ts`). Check each query live against the endpoint.
