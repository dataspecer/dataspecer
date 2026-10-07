# Data Specification Vocabulary (DSV)

This package provides implementation of [DSV](https://w3id.org/dsv#).

## Controlled vocabularies

A `dsv.ttl` document can reference two CV-related things: the CV catalog itself (a [DCAT](https://www.w3.org/TR/vocab-dcat-3/) catalog of `dcat:Dataset` records, one per controlled vocabulary) and `dsv:ControlledVocabularyAssignment`s (linking a class profile to a CV entry, with a usage qualifier and an optional `replaces` override). Both are embedded in the same document so it's self-contained for import, in addition to the catalog also being published standalone as `controlled_vocabulary_catalog.ttl` for the whole project.

**Key decision**: `dsv:controlledVocabulary` points at the CV's *catalog dataset* IRI, not at the vocabulary itself (`ControlledVocabulary.references`, its `skos:ConceptScheme`) — the assignment is about the CV catalog entry (which carries title/pattern/distribution metadata), which in turn `dct:references` the actual vocabulary. See [`writeControlledVocabularyCatalogQuads`](../controlled-vocabulary-model/src/dcat-rdf.ts).

**Key decision**: a specification's own `dsv.ttl` only *embeds* the catalog entries for CVs it directly owns (is a direct child of), the same way it never duplicates a nested/profiled specification's own class profiles — it only *references* CVs owned elsewhere, via a stable, catalog-scoped IRI. This mirrors how `usedVocabularies`/`isProfileOf` already work for cross-specification class references.

### Export

`services/backend`'s `generate.ts` loads the project's models and calls [`generateSpecification`](../specification/src/specification.ts).

1. `fillModels` walks the package tree once, turning raw model records into `ModelDescription[]` and, for CVs specifically, recording `controlledVocabularyOwningPackage: Map<cvModelId, packageId>` — which package directly owns each CV, regardless of nesting depth.
2. From that map, two things are derived once per `generateSpecification` call:
   - `controlledVocabularyCatalogIris: Map<cvModelId, catalogIri>` — every CV's catalog IRI, scoped to *its own* owning package. Used for **resolving references**.
   - `vocabulariesToEmbed` — only the CVs owned by the package currently being exported. Used for **embedding**.
3. [`generateDsvApplicationProfile`](../specification/src/utils.ts) → [`createDataSpecificationVocabulary`](./src/semantic-model/dsv-api-v2.ts) merges *all* CV model descriptions (not just the embedded ones) into the entity containers fed to [`createContext`](./src/semantic-model/entity-model-to-dsv.ts) — this is what lets a class profile's assignment resolve a CV owned by a different (e.g. nested) package, purely in-memory, within one export call.
4. `entityToIri`'s CV branch mints each reference as `entity.iri ?? controlledVocabularyDatasetIri(ownerCatalogIri, entity.id)` — reusing a previously-imported CV's own IRI when it has one (kept stable across exports), otherwise deriving one deterministically from its owning catalog. This is what `writeControlledVocabularyAssignments` writes into `dsv:controlledVocabulary`.
5. [`dsvToRdf`](./src/semantic-model/dsv-to-rdf.ts) writes the conceptual model as usual, then — if given `controlledVocabularies`/`controlledVocabularyCatalogIri` — calls `writeControlledVocabularyCatalogQuads` on the *same* `N3.Writer` before finalizing, merging the embedded catalog's `dcat:Dataset` records into the one document.
6. Separately, `writeDcatCatalog` (in `specification.ts`) produces the standalone, whole-project `controlled_vocabulary_catalog.ttl` via the same writer, just with every CV in the project rather than one package's own.

### Import

[`services/backend/src/routes/import.ts`](../../services/backend/src/routes/import.ts)'s `dsvImport` → `importRdfsAndDsv` fetches a `dsv.ttl` and, before resolving the rest of it, needs to turn `dsv:controlledVocabulary` references back into real local entity ids. It reuses `knownMapping: Record<iri, localId>` — the same table already used to resolve imported classes/relationships — seeded from two sources:

- **Already-imported CVs**: a nested specification profiled via `isProfileOf` is imported *first* (recursively), so by the time the current document is processed, `getModelsForPackage(parentIri, repository)` already sees any `CONTROLLED_VOCABULARY_MODEL` it created; their `.iri` fields seed `knownMapping`.
- **This document's own catalog**: [`parseControlledVocabularyCatalog`](../controlled-vocabulary-model/src/dcat-rdf.ts) (the mirror image of `writeControlledVocabularyCatalogQuads`, same file) turns the embedded `dcat:Dataset` records back into `ControlledVocabulary` objects — each with a freshly minted `id` but its *original* `iri` preserved — which are persisted as new `CONTROLLED_VOCABULARY_MODEL` resources and added to `knownMapping` the same way.

`conceptualModelToEntityListContainer`'s `iriToIdentifier` then resolves every `ControlledVocabularyAssignment.vocabulary`/`replaces` reference through this combined map — falling back to the raw IRI when nothing matches, which `importRdfsAndDsv` scans for afterwards and `console.warn`s about (a `resolvedVocabularyModelIds` set, not a string-shape heuristic).

`ControlledVocabulary.iri` mirrors the existing `ControlledVocabularyAssignment.iri` convention: null for a locally-authored CV, populated with the source IRI once it's been exported or imported, so re-exporting reuses it rather than minting a new one.
