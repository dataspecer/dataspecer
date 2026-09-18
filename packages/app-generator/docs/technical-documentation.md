# Application generator technical documentation

This document describes the application graph editor, app-generator package, backend integration,
and generated runtime as one system. It is for developers changing those components or adding a
graph feature, metadata construct, field type, or data source. The source and tests define current
behavior and exact TypeScript APIs.

## System overview

The Dataspecer [manager](../../../applications/manager) creates the application graph resource and opens it in
the [editor](../../../applications/application-graph-editor), which loads and saves that resource
through the backend. When the user generates an application, the editor sends the current graph to
the backend. The backend loads the referenced data specification, calls `@dataspecer/app-generator`,
and packages the returned file tree as a ZIP archive.

The downloaded application is independent source code. It does not import the generator or call the
Dataspecer backend at runtime. It talks directly to the configured RDF endpoint.

The components divide the work as follows:

- The manager owns resource creation and the link to the editor.
- The editor owns graph authoring, immediate validation, and autosave.
- The backend is the editor's facade for Dataspecer resources, normalized metadata, and generation.
- `@dataspecer/app-generator` validates input and renders an in-memory file tree.
- The backend packages that file tree for download.
- The generated application reads and writes its configured RDF endpoint.

The backend maps internal Dataspecer models through a provider interface and sends normalized
metadata to the editor. This boundary keeps HTTP routes and repository implementations out of the
generator.

### Core terminology

A Dataspecer data structure, also called a structure model in the source metadata, is normalized
into one aggregate. The aggregate has a root RDF class and becomes one module in the generated
application. An application graph node selects an aggregate by the data structure IRI and adds one
operation page over it. Multiple aggregates may use the same RDF class when the specification
defines different structures for the same entity type.

## Related documentation

- The [package README](../README.md) has the Node.js requirement, build commands, public entry
  points, and a minimal `generateApp` example.
- The [editor README](../../../applications/application-graph-editor/README.md) explains how to run
  the editor and configure its backend and manager URLs.
- The [samples](../samples/README.md) provide an end-to-end workflow with importable specifications,
  application graphs, RDF data, and a local SPARQL endpoint.
- The [generated application README](../assets/generated-app/README.md) documents configuration and
  extension points available after generation.

## Application graph contract

The canonical JSON Schema is
[`src/graph/application-graph.schema.json`](../src/graph/application-graph.schema.json).
The matching TypeScript types and enums are in
[`src/graph/types.ts`](../src/graph/types.ts). The JSON file is the source
for external validation, while TypeScript consumers use the exported types. Tests keep their enum
values and required properties aligned to prevent possible regressions.

An `ApplicationGraph` contains:

- `name` - used for the generated package and archive name
- `dataSpecificationIri` - used to load Dataspecer metadata
- `datasources` - currently restricted to one RDF endpoint
- `nodes` - pair of a data structure IRI and a CRUD operation
- `edges` - connects operation nodes by ID

The optional `$schema` property lets hand-written JSON refer to the canonical schema. It is part of
the TypeScript `ApplicationGraph` interface, but the generator does not use its value at runtime.

### Nodes and configuration

A node represents one page. Its `aggregateIri` selects a data structure and its `operation` is one
of `Create`, `ReadList`, `ReadDetail`, `Update`, or `Delete`. The generator normalizes the node ID
into a route ID. `config.pageTitle` overrides the generated heading.

Create and update nodes may contain an `associations` record keyed by dot-separated field paths. A
value of `composition` means that the target is owned and edited with its parent. An omitted path or
an explicit `aggregation` means that the target is an independent reference. Every segment before a
nested configured association must be a composition on the same node. Semantic validation also
compares ownership across structures for the same RDF class and rejects conflicting meanings for
the same association.

Delete nodes may contain a `delete` record. Its keys are composition paths and its current policy is
`cascade`.

### Edges

An edge has an ID, source node ID, target node ID, and type:

- `transition` is user-initiated navigation from `ReadList` or `ReadDetail`
- `redirect` runs after a successful `Create`, `Update`, or `Delete`

The editor uses node and edge IDs as identity keys, so they need to be unique. Structural validation
separately rejects node IDs that normalize to the same generated route.

Operation-pair rules live in
[`edge-rules.ts`](../src/validation/rules/edge-rules.ts). Structural rules
check whether the pair is allowed. Semantic rules then compare the RDF classes and association
paths involved in the navigation.

## Editor architecture

The editor is organized by responsibility:

| Area                                                                                              | Responsibility                                                         |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`src/backend`](../../../applications/application-graph-editor/src/backend)                       | Resource, metadata, and generation requests                            |
| [`src/graph`](../../../applications/application-graph-editor/src/graph)                           | Pure parsing, graph changes, JSON application, and skeleton generation |
| [`src/diagram`](../../../applications/application-graph-editor/src/diagram)                       | React Flow projection, layout, geometry, and interactions              |
| [`src/components/sidebar`](../../../applications/application-graph-editor/src/components/sidebar) | Settings, element forms, JSON editing, and problems                    |
| [`src/hooks`](../../../applications/application-graph-editor/src/hooks)                           | Autosave, validation synchronization, and shortcuts                    |
| [`src/validation`](../../../applications/application-graph-editor/src/validation)                 | Violation presentation and links to graph elements                     |
| [`src/store.ts`](../../../applications/application-graph-editor/src/store.ts)                     | Zustand state and Zundo history                                        |

The graph is stored as the resource's main JSON data. Node positions are stored in a named `visual`
JSON blob. React Flow nodes and edges are projections of those two values, not another graph model.

If a stored resource fails syntax validation, the editor opens a JSON repair screen before creating
the typed graph state. The corrected resource must match the current schema before the visual editor
can open it.

The store keeps graph and position changes in undo history. Resource loading, metadata, validation,
save state, generation messages, dialogs, and other UI requests stay outside it. State belongs in
the history when users would expect undo to restore it.

### Starting-graph generation

The editor's [`Generate graph` algorithm](../../../applications/application-graph-editor/src/graph/generate-graph.ts)
groups selected structures by RDF class. For each class, the structure with the fewest fields owns
the `ReadList` node and the structure with the most fields owns the other selected operations. It
then connects the conventional list, detail, and mutation flow and adds transitions from list or
detail pages to associated detail classes. The generated graph is a starting point and does not
preserve every selected structure-operation combination.

### Autosave and generation

[`use-autosave.ts`](../../../applications/application-graph-editor/src/hooks/use-autosave.ts) starts a
save after a short debounce. New snapshots replace pending ones but wait for any request already in
progress. A failed request does not prevent later saves.

Autosave applies the complete JSON Schema before writing. Structural and semantic errors do not
prevent saving because incomplete graphs are useful work in progress. They do prevent generation.

The generation action flushes autosave so the stored project matches the editor, then posts the
current graph JSON to the backend. The generation endpoint uses that request body as its graph
input.

Backend routes are registered in
[`services/backend/src/main.ts`](../../../services/backend/src/main.ts), with their handlers in
[`routes/app-generator.ts`](../../../services/backend/src/routes/app-generator.ts). One endpoint
returns normalized metadata for editor validation. The other returns either a ZIP archive or
validation violations.

## Validation and metadata

Validation accumulates violations. Each violation has a stable code, message, severity, and usually
a JSON pointer. Errors make the result invalid. Warnings remain in a valid result.

The stages run in this order:

1. [`validateGraphSyntax`](../src/validation/validate-syntax.ts) applies
   the JSON Schema to unknown input and returns a typed graph only on success.
2. [`validateGraphStructure`](../src/validation/validate-structure.ts)
   checks rules that do not need data specification metadata.
3. `DataspecerMetadataProvider` loads normalized metadata.
4. [`analyzeGraphSemantics`](../src/validation/analyze-semantics.ts)
   enriches that metadata and runs rules that depend on it.

[`validateApplicationGraph`](../src/validate-application-graph.ts) is the
server-side entry point for the full sequence. It stops before metadata loading when structural
errors already make generation impossible. It returns metadata mapping failures as validation
violations. Provider-specific exceptions do not cross this boundary.

The browser-safe `@dataspecer/app-generator/graph` entry point exports the graph contract, schema,
syntax and structural validators, and semantic analysis over normalized metadata. It has no Node.js,
filesystem, rendering, or concrete Dataspecer loader dependencies. The editor uses this entry point
for immediate checks and adds semantic results after fetching normalized metadata from the backend.
Server-side generation still repeats the full validation sequence.

### Dataspecer metadata mapping

The generator core depends on
[`DataspecerMetadataProvider`](../src/metadata/types.ts). Its single method
loads `SpecificationMetadata` for a data specification IRI. Concrete Dataspecer access stays behind
that interface.

The production implementation is
[`DataspecerSpecificationMetadataProvider`](../src/metadata/dataspecer-specification-metadata-provider.ts).
It accepts a `SpecificationSourceLoader` and maps aggregated semantic entities and Data PSM
structures. The mapper handles:

- Data PSM schemas, class roots, attributes, and association ends
- class references and includes, including missing-target and cycle checks
- specialization choices represented by Data PSM `Or` association targets
- forward and reverse RDF properties
- cardinalities, descriptions, examples, and regular-expression constraints
- instance identity policies and multilingual datatypes

One structure model maps to one aggregate. Its root must be one Data PSM class. Multiple roots and a
specialization at the root are rejected. Specializations are supported as association targets.

The production provider maps every source structure before semantic analysis filters to the
aggregates reachable from graph nodes. As a result, a mapping error in an unused structure can fail
metadata loading. After mapping succeeds, normalization, semantic rules, and rendering work with
the reachable subset and its referenced structures.

[`enrichMetadata`](../src/validation/enrich-metadata.ts) copies ownership
from graph node configuration into normalized fields. Unconfigured associations become
aggregations. Later steps reconcile compatible value constraints and RDF-property aliases before
building the generation model.

## Generator pipeline

[`generateApp`](../src/generate-app.ts) accepts unknown graph input, a
metadata provider, and optional directory output settings. It returns a `GenerateAppResult`.
Validation, formatting, and file-write failures use `success: false` and violations.

```text
unknown graph
  -> syntax and structural validation
  -> metadata loading, mapping, enrichment, and semantic validation
  -> generation model
  -> render context
  -> Eta templates and copied assets
  -> Prettier formatting
  -> in-memory file tree
  -> optional directory write
```

`generateApp` does not create an archive. The backend packages the returned in-memory files into a
ZIP for the editor download endpoint.

[`buildGenerationModel`](../src/generation-model/build-generation-model.ts)
turns a validated graph and enriched metadata into descriptors for the application, data source,
aggregates, operations, navigation, and redirects. It resolves names, routes, actions, association
paths, redirect targets, and cascade paths before rendering.

Templates consume prepared values and handle presentation. Graph lookup, metadata resolution, and
generation choices happen earlier in validation, enrichment, or the generation model.

The same graph and metadata produce the same files, so the output is deterministic.

### End-to-end traces

A `ReadList` node crosses the layers as follows:

```text
graph node
  -> syntax, structure, and metadata-dependent validation
  -> generated operation and aggregate descriptors
  -> route, page, operation strategy, and LDKit schemas
  -> DataSource.readList() at runtime
```

A usable transition follows a similar path:

```text
graph edge
  -> operation-pair and RDF-class or association validation
  -> generated navigation descriptor
  -> page, row, breadcrumb, or association action
  -> generated router destination
```

Validation may retain a transition as a warning when its source has no compatible class or
association path to the target detail page. Such an edge remains in the graph but produces no
runtime action.

### Asset and rendering pipeline

[`assets/generated-app`](../assets/generated-app) has the same layout as
the application it produces. A file ending in `.eta` is rendered to the same path without that
suffix. Other files are copied unchanged.

Aggregate templates produce `model.ts`, `descriptor.ts`, and `ldkit-schema.ts` once per reachable
aggregate. Page and operation templates run once per graph node. Files such as `routes.tsx`, README,
and package configuration run once per application.

[`scripts/compile-assets.mjs`](../scripts/compile-assets.mjs) embeds the
asset tree in `src/generated/generated-app-assets.ts`. Package build, test, and lint commands run
this step first. Runtime rendering reads the compiled module, so a packaged generator does not need
the original asset directory.

[`renderGeneratedApp`](../src/rendering/render-generated-app.ts) returns
an in-memory `FileTree`.
[`formatGeneratedApp`](../src/rendering/format-generated-app.ts) applies
Prettier according to each generated path. An output directory is written only after both steps
succeed, and `allowOverwrite` is required when the target is not empty.

## RDF schemas and descriptors

Each generated module contains two related contracts:

- `descriptor.ts` describes fields for forms, lists, detail views, validation, composition, and
  reference resolution
- `ldkit-schema.ts` maps those fields to RDF reads and writes

[`buildLdkitSchemaBundle`](../src/rendering/ldkit-schema.ts) creates operation-specific LDKit schemas:

- List schemas omit compositions to keep each row bounded.
- Detail schemas expand inline compositions.
- When reference display fields can be resolved from descriptors, references use shallow nested schemas containing those primitive fields so the values are loaded
  with the owning entity in one request.
- A reference without display fields is read directly as an IRI.
- An expanded reference or composition may point to a target for which the constructed graph has no
  subject triples. LDKit cannot decode that nested entity by itself, so the generated adapter adds a
  private marker triple to the parsed response. The marker is ignored by the schema and never
  reaches the endpoint, but it preserves an ID-only target and lets the runtime distinguish a
  missing target from an empty stored entity.
- Write schemas store nested entities separately and place their IRIs in
  the parent.
- Specialization write schemas select the concrete class and fields.

Read properties remain optional even when the generated domain model marks a field as required.
External RDF may be incomplete, and the application should still display the entity. Form
validation enforces cardinality before a generated write. Code that works directly with an external
read must still handle a missing value.

`ReadListResult<TModel>` still types each row as the complete generated model from `model.ts`.
Because the list schema omits compositions, a composition property on a list row is `undefined`
even when that model declaration marks it as required. Treat composition properties as unavailable
when working directly with list results.

Reverse properties are queried in the inverse direction. The default adapter handles their writes
outside LDKit where needed because LDKit insert behavior does not cover inverse properties.

## Generated runtime

The generated Vite application uses React, React Router, MUI, and LDKit:

```text
src/config/              data source, aggregate registry, application settings
src/modules/<aggregate>/ generated models, descriptors, schemas, pages, operations
src/shared/              forms, views, operations, navigation, and data-source code
src/routes.tsx           lazy routes generated from graph nodes
src/App.tsx              router and application providers
src/main.tsx             browser entry point
```

`src/shared` does not import from `src/config` or `src/modules`. Generated modules depend on shared
code, while shared code receives descriptors and services through types, arguments, props, or React
context.

### Descriptors and operation strategies

An `AggregateDescriptor` identifies a structure, its RDF class, its fields, and a factory for an
empty model. The aggregate registry is keyed by aggregate IRI. Association fields use it to resolve
reference targets and composition structures.

Every generated page constructs an operation strategy. The subclass in its module is the main
extension point for page-specific behavior.

Read pages also generate a page action component. Detail actions receive the loaded entity. List
action files can register per-row components, the list adds an Actions column only when graph
navigation or a custom row component needs it.

[`invokeOperation`](../assets/generated-app/src/shared/operations/operation-strategy.ts)
runs this lifecycle:

```text
validateRequest? -> execute -> postprocess?
```

If `validateRequest` returns issues, the other steps do not run. `execute` returns an
`OperationResult`, either `{ ok: true, data }` or `{ ok: false, issues }`. `postprocess` receives
that result and may preserve or replace it.

`OperationContext` supplies the aggregate descriptor, aggregate registry, data source, route
parameters, and optional payload. Update operations also receive the original hydrated payload.
Delete operations receive configured cascade paths. Expected user-facing failures should be
validation issues, thrown errors are for unexpected failures.

### Data source contract

[`DataSource`](../assets/generated-app/src/shared/data-source/data-source.ts)
supports paged and sorted lists, detail reads by entity IRI, root and inline mutations, incoming
reference lookup, and optional reference candidate lookup by RDF class.

The generated `RdfLdkitDataSource` is the default adapter. A replacement must preserve entity IRIs
where routing and forms expect them, or adapt every boundary consistently. Without `listByType`,
reference fields cannot offer a list of candidates. The default `listByType` query returns at most
200 entities. It uses descriptor-selected properties when available, otherwise it tries
`dcterms:title`, `skos:prefLabel`, `rdfs:label`, and `foaf:name`, then falls back to the IRI.

### Forms and composite mutations

Aggregations hold reference IDs. Compositions hold nested entity records and may open in a
route-addressable pane. The pane path is part of the URL, so browser back and forward can move
between nested editing panes without adding graph nodes.

Create and update planning walks the composition tree. Children are written before the parent that
stores their IRIs. Update compares the edited tree with the original hydrated value to create,
update, or remove children. Delete hydrates configured cascade paths and plans the deepest deletes
first.

Plans are sequential, not transactional. If a middle request fails, earlier endpoint changes
remain. Entity identifiers also cross URL, RDF-term, and SPARQL boundaries, so validation and
escaping must stay at each boundary.

## Extension points and change workflows

Each workflow identifies the layers involved in a common change. A graph concept must work in both
the editor and the generator. A generated control must also support reading and writing its RDF
representation.

From `packages/app-generator`, run `npm run build`, `npm test`, and `npm run lint` before finishing a
package change. Changes to the browser-safe `./graph` entry point also require the editor checks
listed in the [editor README](../../../applications/application-graph-editor/README.md).

### Change the application graph contract

1. Change `src/graph/application-graph.schema.json` and the matching types or enums in
   `src/graph/types.ts` together.
2. Add syntax or structural validation for constraints that can be checked without Dataspecer
   metadata. Add metadata-dependent behavior to semantic analysis.
3. Project the new value into the generation model if rendering or runtime behavior needs it.
4. Update the editor parser, forms, and diagram behavior that read or write the affected graph
   property.
5. Cover JSON acceptance in `syntax-validation.spec.ts`, graph-only rules in
   `structural-validation.spec.ts`, and metadata-dependent rules in
   `semantic-validation.spec.ts`. Run the editor checks as well as the generator checks.

Stored application graphs have no separate format version or automatic migration layer. Before
making a schema property required or changing an accepted value, account for existing saved and
imported graphs. Prefer compatible optional additions where possible. A breaking syntax change must
include a deliberate repair or migration path and user-facing documentation. Without one, existing
resources open in the editor's JSON repair screen.

Adding an operation type follows this workflow but reaches more places: operation-pair rules,
editor controls, navigation, generated routes and pages, and the default runtime strategy all need
a defined behavior. Resolve those decisions in validation and the generation model so templates
only receive values ready to render.

### Add a validation rule

Choose the earliest validation stage with enough information. A metadata-free rule belongs under
`src/validation/rules` and is called from `validateGraphStructure`. A rule about RDF classes,
association paths, ownership, or mapped fields belongs in semantic analysis.

Return a stable `ViolationCode` and the most precise JSON pointer available. The editor uses both
to place the problem next to a node, edge, setting, or JSON range. Rules shown by the editor must be
exported through the browser-safe `@dataspecer/app-generator/graph` boundary. Add one accepted and
one rejected case. Tests for warnings should also show that the graph remains valid.

### Support another Dataspecer construct

1. Extend the normalized types in `src/metadata/types.ts` only if later stages need new information.
2. Map the source resources in
   `src/metadata/dataspecer-specification-metadata-provider.ts`, including an actionable mapping
   issue for unsupported or inconsistent input.
3. Add a representative provider fixture to
   `tests/dataspecer-specification-metadata-provider.spec.ts`.
4. If the construct changes ownership, field shape, reachability, or valid graph behavior, carry it
   through enrichment and semantic validation before changing the generation model.
5. Add rendering or generated-runtime coverage only when the normalized construct changes emitted
   source or runtime behavior.

Dataspecer repository objects remain at the provider boundary. Validation, generation, and the
generated application depend on normalized metadata, not Data PSM implementation types.

### Add a datatype or form control

Start with the datatype mapping in `src/rendering/datatypes.ts`. Trace the value through the
generated model type, empty-value factory, descriptor, form control, display formatting,
validation, LDKit schema, and RDF conversion. The same runtime representation must survive an RDF
read, form edit, and RDF write.

Exercise scalar and repeated cardinalities, missing values in external RDF, and list formatting or
sorting where applicable. Form-model behavior belongs in `generated-form-model.spec.ts`. RDF
encoding and decoding belongs in `generated-rdf-data-source.spec.ts`. Emitted types and controls
belong in `rendering.spec.ts`.

### Change generated application behavior

Edit the source tree under `assets/generated-app`. Ordinary files are copied verbatim. Use an Eta
template only when the file needs generation context. Per-aggregate and per-page templates must be
registered in `src/rendering/render-generated-app.ts` so the renderer expands their placeholder
paths.

After an asset change, run `npm run compile-assets` to update the embedded asset module in the
generator source. When verifying through the backend, `npm run build` covers that step and also
rebuilds `@dataspecer/app-generator`. Restart any running backend process because it imports the
compiled `lib/` package and does not reload it when assets change. Choose verification based on the
affected boundary:

- `rendering.spec.ts` checks generated paths, imports, and dynamic source.
- `generate-app.spec.ts` checks the complete output, including its clean-room typecheck.
- the generated form, mutation, navigation, and RDF specs exercise shared runtime modules directly.
- a generated sample verifies browser interaction and a real SPARQL round trip.

### Add a data source adapter

Implement the generated runtime's
[`DataSource`](../assets/generated-app/src/shared/data-source/data-source.ts) interface and provide
the adapter through `DataSourceProvider`. Generated pages use this interface and have no dependency
on the concrete RDF adapter.

Verify list totals and sorting, missing detail records, root and inline mutations, incoming
references, and partial failures. Implementing the optional `listByType` method enables reference
candidate browsing. If an adapter represents entity IDs differently, adapt the routing, form, and
mutation boundaries consistently because the default runtime treats IDs as IRIs.

### Customize a generated application

For behavior on one page, start with its generated operation subclass. Override `validateRequest`
or `postprocess` when the default CRUD action remains suitable. Override `execute` when the data
operation itself must change. Read-list and read-detail pages also provide generated action
components for custom page or row controls.

A replacement data source is the stable extension point for different persistence behavior.
`src/theme.ts` is the local visual extension point. Changes to generated pages or `src/shared` are
overwritten by a newly generated tree. Preserve such local edits through a deliberate merge.

## Regeneration and compatibility

The generator renders a complete source tree and does not merge file contents with an existing
application. It writes into a non-empty output directory only when overwrite is explicitly allowed.
In that mode it overwrites generated paths that already exist but does not remove unrelated or stale
files from the directory.

Keep a generated application in version control. Generate the replacement into a clean directory,
compare the trees, and adapt any local operation, data source, theme, page, or shared-runtime
changes. A graph change can alter generated model and descriptor types, so an old override may no
longer compile without changes.

## Current limits

### Graph and generation

The implementation requires exactly one RDF data source. It rejects circular composition,
composition through aggregation, aggregation cascade, incompatible RDF-property aliases, and
ownership configurations that cannot be planned safely.

### Generated runtime

List pages omit composition expansion to keep paging bounded. Incoming-reference lookup returns at
most ten entries for a delete warning. Cascade and incoming-reference previews are computed
independently, so a composed child that references its parent can appear in both warnings. Required
RDF values may still be absent on read because the adapter keeps incomplete external entities
visible.

Composite writes have no transaction rollback, and the application does not enforce referential
integrity. Creating an entity with an existing IRI may merge values into the existing RDF subject.

Reference pickers return at most 200 candidates, allow a manually entered IRI, and can use the
fallback label predicates described above. List and detail reads do not make a separate
fallback-label query for a bare reference whose target has no display fields in the aggregate
descriptors, so those views show its IRI. Dataspecer codelist metadata does not produce a specialized
choice control. The association uses the ordinary reference input.

### Editor and deployment

The manager pins the data specification when it creates the graph, the Settings form does not offer
a specification picker. JSON edits and imports can change the IRI after a warning. The editor also
autosaves schema-valid graphs with structural or semantic errors so incomplete work is not lost,
although those errors block generation.

The generated router uses browser history. Production hosting needs an SPA fallback to
`index.html`. Hosting below a URL subpath may also require matching Vite and router base settings.
