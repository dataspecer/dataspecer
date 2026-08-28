# Generated application development guide

Read `README.md` for setup, layout, runtime behavior, and regeneration. This file describes the
contracts used by the generated source.

## Ownership and regeneration

Regeneration overwrites every file. A lasting model, page, navigation, association, or cascade
change belongs in the application graph or its Dataspecer data specification. A change that should
affect every generated application belongs in the generator.

Keep local application code in version control and reapply it to a newly generated tree with a
diff. Use these extension points, in order:

1. a generated operation subclass for one page.
2. a generated action component for list or detail controls.
3. data source configuration or a `DataSource` implementation.
4. `src/theme.ts` for visual changes.
5. a generated page for local wiring.
6. `src/shared` for behavior used by several pages.

Changes further down the list usually take more work to carry into a regenerated application.

## Source boundaries

`src/shared` is a runtime library copied into every generated application. It must not import from
`src/config` or `src/modules`. Those directories depend on shared types and components, not the
other way around. Pass aggregate descriptors, registries, data sources, navigation, and settings
through function arguments, props, or existing contexts.

`@/` resolves to `src`. Use it across source areas. Relative imports are appropriate between nearby
files and within `src/shared`.

Generated module filenames are kebab-case. Each module contains its model, descriptor, LDKit schema,
pages, operation subclasses, and action components for read pages. A page owns its route-specific
title, navigation descriptor, strategy, and cascade configuration.

## Page actions

Each list and detail route has a generated `<route>-actions.tsx` file. Its page action component is
already connected and returns `null` until customized. Detail page actions receive the loaded
entity. List page actions use no view state and can obtain application services through hooks and
contexts.

List action files also export `additionalRowActions`. Add component types to this array to render
them after the graph-derived actions in every row's Actions cell. A row action receives the complete
row entity and the data grid's `tabIndex`. Pass that value to the interactive control so keyboard
navigation keeps working.

Keep data loading in the shared view. Action components should use their typed props instead of
reading the same entity again. They may use normal React hooks and application contexts.

## Operation lifecycle

Each `<route>-operation.ts` class extends one of the default CRUD strategies. The page passes it to
`invokeOperation` in `src/shared/operations/operation-strategy.ts`, which runs:

```text
validateRequest? -> execute -> postprocess?
```

When `validateRequest` reports issues, the invocation returns a failed result without running
`execute` or `postprocess`. Otherwise `execute` returns an `OperationResult`. `postprocess` receives
that result, including a failed result, and can preserve or replace it.

`OperationResult<T>` is either `{ ok: true, data: T }` or `{ ok: false, issues }`. Use validation
issues for expected user-facing failures. Let unexpected failures throw so the page's error handling
can report them as operational errors.

Override `validateRequest` or `postprocess` for most page-specific behavior. Override `execute` only
when the default read or mutation itself must change. Read the `OperationContext` and result types in
`src/shared/operations` before changing a strategy, and preserve the result type expected by the
page.

## Data source contract

`src/shared/data-source/data-source.ts` defines the storage boundary. Read that interface before
replacing the data source. A replacement must preserve the existing paging, sorting, detail, root
mutation, inline composition, and incoming-reference behavior. If it does not implement the
optional `listByType`, reference fields cannot browse candidates.

Provide the data source through `DataSourceProvider` in `src/main.tsx`. Components obtain it with
`useDataSource`. Do not import the concrete RDF adapter into page components.

## Aggregate and field descriptors

`src/config/aggregate-registry.ts` maps aggregate IRIs to descriptors. Fields refer to other
structures by aggregate IRI, so reference and composition resolution must use this registry rather
than a generated module name.

Each `descriptor.ts` supplies the metadata read by lists, detail views, forms, validation, and
mutation planning. It includes field paths, cardinality, RDF mapping, form controls, association
targets, specializations, and nested composition fields. Read the interfaces in
`src/shared/types/aggregate.ts` before changing that contract.

Do not add a page-only property to the shared field descriptor. Keep local presentation state in
the page or component unless several descriptor-driven consumers need the same contract.

## Values and identifiers

Entity IDs are IRIs. They cross URL, form, RDF, and SPARQL boundaries. Keep validation and encoding
at each boundary. Do not interpolate unchecked text into a SPARQL request. The default create form
uses the base in `src/config/app-config.ts` or generates a `urn:uuid` IRI.

Dates are JavaScript `Date` values in generated models and Luxon values inside date pickers.
Multilingual values use `Record<string, string[]>`. The empty string key holds untagged text. Loaded
language tags are kept even when they are not listed in the configured initial languages.

Associations have different runtime shapes:

- an aggregation stores an entity IRI or a small reference value.
- a composition stores an editable nested entity record.
- runtime specialization evidence uses the reserved `__specializationIri` and `__rdfTypes` fields,
  which are not written as ordinary model properties.

The specialization selected for a loaded entity is immutable. Changing it would switch the RDF
class and applicable field set without a defined migration.

## Forms and composite mutations

Forms use `noValidate` because application validation must collect and display all issues. Adding
native browser validation can block submit before those issues are produced.

Composite create and update plans write children before parents so a parent can store child IRIs.
Update compares the edited tree with its original hydrated value. A composed child removed from the
tree is deleted once its parent no longer refers to it. Cascading delete hydrates configured paths
and deletes deepest children first.

The requests run sequentially and are not transactional. If a later request fails, earlier writes
remain in the data source. Do not add UI text that promises rollback or atomic saves.

Generated model properties can be stricter than external RDF reads. LDKit read schemas keep
properties optional so incomplete RDF remains visible. Code working with a value just read from an
external store must guard a missing property even when its generated TypeScript model marks that
property as required. References load their primitive display fields through shallow nested read
schemas. The RDF adapter preserves an object-only reference as an ID-only value when the target is
missing or has no selected display data.

## Routing and deployment

Routes carry entity IRIs as URL parameters. Use the helpers in `src/shared/navigation` instead of
building entity URLs directly. Composition panes also use the URL, so preserve those parameters
when changing nested form navigation.

The router uses browser history. Production hosting needs an SPA fallback to `index.html` for
unknown paths. A URL subpath deployment needs matching Vite and router base configuration.

## Verification

Run:

```sh
npm run lint
npm run build
npm run dev
```

Lint and TypeScript cover different failures. React Hooks dependency rules are lint errors. After
the static checks, exercise the changed route against a representative endpoint, including loading,
validation, the successful path, and the visible failure path.
