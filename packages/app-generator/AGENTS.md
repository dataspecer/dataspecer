# App-generator development guide

This file applies to `packages/app-generator` and its generated-application assets. Inspect the
relevant source and nearest tests before changing behavior.

The source and tests define current behavior and exact APIs.

## Graph contracts

The graph operations are `Create`, `ReadList`, `ReadDetail`, `Update`, and `Delete`. Graph JSON uses
these exact enum strings.

The JSON Schema and TypeScript types form one public contract:

- `src/graph/application-graph.schema.json` is canonical for JSON validation and external tools.
- `src/graph/types.ts` is canonical for TypeScript consumers.
- syntax tests keep their accepted values and required properties aligned.

The package root is the server and programmatic generation entry point. `./graph` is a smaller,
browser-safe entry point used by the editor. Do not expose Node.js, filesystem, rendering, or
concrete metadata-loader dependencies through `./graph`.

## Pipeline boundaries

Keep these stages separate:

1. Syntax validation accepts `unknown` and applies the canonical JSON Schema.
2. Structural validation checks rules that need no metadata.
3. A `DataspecerMetadataProvider` loads normalized data specification metadata.
4. Semantic analysis enriches metadata and checks graph behavior against it.
5. The generation model resolves all values needed by output.
6. Rendering applies Eta templates and copies runtime assets.
7. Formatting and output turn the rendered tree into stable files.

The editor and backend integration are consumers of these stages. Generator core must not import UI
state, backend route handlers, or a concrete repository client. New Dataspecer access belongs behind
`DataspecerMetadataProvider` or `SpecificationSourceLoader`.

Templates should be simple projections. Resolve association meaning, navigation targets, route
requirements, names, cascade paths, and reachable aggregates before rendering. If a template needs
to search the graph or reconstruct semantics, move that work into validation, the generation
model, or render context.

## Validation and failures

Validation accumulates violations. Errors block generation. Warnings remain in a successful result.
Return a precise JSON pointer when the graph location is known and use stable `ViolationCode`
members so the editor can present and target problems without parsing messages.

Metadata mapping errors are translated into validation violations at the full-validation boundary.
Expected syntax, semantic, formatting, and output failures must remain in `GenerateAppResult` rather
than becoming thrown control flow. Unexpected programmer errors may still throw.

Add validation rules to the earliest layer that has enough information. A metadata-free rule
belongs in structural validation. A rule about aggregate classes, association paths, RDF shapes, or
enriched ownership belongs in semantic analysis.

New validation behavior needs an accepted and rejected case. Warning behavior also needs a case
showing that it does not make the result invalid.

## Metadata and RDF mapping

Normalized metadata is an internal boundary, not a mirror of every Dataspecer resource. Map source
resources in `dataspecer-specification-metadata-provider.ts`, report unsupported shapes there, and
keep later stages independent of Data PSM classes.

Association ownership comes from Create and Update node configuration. It is enriched onto fields
after mapping. Associations without an explicit valid kind default to aggregation. Keep nested-path,
same-class consistency, composition-cycle, and cascade rules aligned when this behavior changes.

Generated LDKit schemas have different jobs. List reads omit compositions, detail reads expand them,
and references expand only the primitive fields used as display values. Writes use target-specific
schemas with nested entities stored separately. The RDF adapter normalizes constructed graphs so a
reference with no selected target triples still decodes as an ID-only value. Do not collapse these
schemas unless read paging, incomplete RDF, specializations, reverse properties, and composite
writes have all been accounted for.

Schema bundle write keys are shared with the generated RDF adapter. Build contract tests from the
real `buildLdkitSchemaBundle` rather than repeating a handwritten encoding on both sides.

## Generation model and determinism

The generation model is the contract between semantics and presentation. Keep it free of Eta and
generated-runtime implementation objects. Prefer explicit projections for generated descriptors so
an internal metadata field cannot leak into generated source by accident.

The same graph and metadata must produce byte-identical files across supported environments. Use
stable ordering for aggregates, operations, fields, paths, imports, and emitted files. Avoid
locale-dependent comparisons, iteration over unordered external records, current time, random IDs,
or machine-specific paths.

Identifiers and paths cross several boundaries. Use the shared naming and field-path helpers rather
than adding another local encoding. Keep operation IDs, route IDs, entity IRIs, field paths, and
generated property names distinct even when two currently have the same string.

## Generated application assets

`assets/generated-app` is the source tree of a generated application. Edit it directly:

- a file ending in `.eta` is rendered to the same path without the suffix.
- any other file is copied unchanged.
- `{module}` and `{route}` paths are repeated templates registered by the renderer.

The nested `assets/generated-app/AGENTS.md` describes the contracts of the generated output. Apply
those contracts when editing the asset tree. The same file is copied into every generated
application as its local development guide.

Package scripts compile the tree into `src/generated/generated-app-assets.ts`. Do not edit that
module. Runtime rendering imports it and must not read `assets/generated-app` from the filesystem.
This keeps packaged backend deployments independent of source asset files.

`src/shared` in the asset tree is a generated runtime library. It must not import from generated
`src/config` or `src/modules`. Pass descriptors, registries, and services into shared code instead.

When changing generated runtime behavior, update the generated README and AGENTS templates if the
command, layout, behavior, limitation, or extension contract changed. The rendered documentation
must make sense outside the Dataspecer repository.

## Public changes

When changing the graph contract, update together:

- JSON Schema.
- TypeScript graph types and enums.
- syntax, structural, and semantic rules as applicable.
- browser-safe exports.
- editor behavior and tests.
- user and technical documentation.

When changing generated models, descriptors, strategies, or `DataSource`, review operation
subclasses and every runtime consumer. Do not make LDKit read properties required only to match a
generated domain type. External RDF may be incomplete.

Do not add speculative provider methods, data-source kinds, descriptor fields, templates, or
extension layers. Add a boundary when a current use case needs it and a focused test can state its
contract.

## Tests

Test at the layer that owns the behavior:

- syntax and structure specs for graph-only behavior.
- metadata-provider and semantic specs for Dataspecer mapping and enrichment.
- generation-model specs for prepared descriptors and navigation.
- rendering specs for template output and paths.
- generated-runtime specs for forms, operations, mutations, and RDF behavior.
- the clean-room generated-app typecheck for output package independence.

Fake metadata fixtures are preferred for deterministic generator tests. Use a real SPARQL engine
only when its query, update, or RDF behavior is the fact under test.

Before finishing a package change, run:

```sh
npm run build
npm test
npm run lint
```

Also run editor checks when `./graph` changes. Add focused coverage for changed behavior and update
the public or generated documentation when its contract changes.
