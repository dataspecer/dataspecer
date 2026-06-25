# @dataspecer/model-store

A Dataspecer project consists of several **models** (semantic model, visual model, ...). The model store (`packages/model-store`) gives a frontend client a single place to read, modify, undo/redo and synchronize all of them at once.

The key idea: every model is interpreted as **a set of entities** - plain JSON objects with an `id` and a `type`. The model store does not understand what an entity *means* (e.g. that it's a class or a visual node); it only tracks which entities exist in which model and notifies you when that set changes. To understand what a given model's entities actually mean and how to change them, you use that model's own interface and operations (see the table below).

## Using it as a client (CME for example)

The Conceptual Model Editor (CME) gets a ready-to-use store via `createCMEModelStore` from `@dataspecer/model-store/implementation`:

```ts
import { createCMEModelStore } from "@dataspecer/model-store/implementation";

const modelStore = createCMEModelStore({
  projectId: dataSpecificationIri, // root package of the project
  backendUrl,
  httpFetch,
});

await modelStore.initialize();
await modelStore.waitForModelsToLoad();
```

After this, the store has loaded the project model (the virtual model describing which models exist in the project) and every other model it knows about (semantic, visual, PIM/RDFS, SGOV query model - see the table).

**Reading entities**

```ts
const allEntities = modelStore.getAllEntities(); // Record<modelId, Record<entityId, Entity>>

const unsubscribe = modelStore.subscribeToEntityChanges((event) => {
  // event.entityChanges: Record<modelId, EntityChange[]>
});
```

**Writing entities** - dispatch operations created with the helpers from the model's own package (see the table), grouped into a single transaction:

```ts
modelStore.addOperationForTransaction([
  { modelId: semanticModelId, operation: createClass({ ... }) },
]);
modelStore.addOperationForTransaction([
  { modelId: visualModelId, operation: createAddVisualNodeOperation({ ... }) },
]);
const result = modelStore.commitTransaction({});
await result.confirmation;
```

or, for a single batch, `modelStore.transaction(operations, {})`.

**Undo/redo** - this is provided by the model store itself, not by individual models; do not implement your own undo/redo when consuming it:

```ts
modelStore.undo();
modelStore.redo();
const { canUndo, canRedo } = modelStore.getUndoRedoState();
modelStore.subscribeToUndoRedoState((state) => { ... });
```

**Saving** - the store does not auto-save; subscribe to commits and save yourself:

```ts
modelStore.subscribeToTransactionCommit(() => {
  modelStore.saveByOverride();
});
```

A complete working example (using `createDSEModelStore`, a superset of the CME store that also includes the structure model and a few blobs) is in [`applications/data-specification-editor/src/configuration/provided-configuration.ts`](../../applications/data-specification-editor/src/configuration/provided-configuration.ts).

## Models

For each model, **Operations** links to where to find functions that create operations to dispatch to that model, and **Interface** links to where the model's entity types are defined.

All models also accept the generic `SetEntityOperation` / `UpdateEntityOperation` from [`packages/core/src/operation/entity-operations.ts`](../core/src/operation/entity-operations.ts), which overwrite an entity directly.

| Model | Operations | Interface |
|---|---|---|
| Project model (virtual, lists models in the project) | [`packages/project-model/src/operations.ts`](../project-model/src/operations.ts) | [`packages/project-model/src/model.ts`](../project-model/src/model.ts) |
| Semantic model (vocabulary classes/relationships/profiles) | [`packages/core-v2/src/semantic-model/operations/operations.ts`](../core-v2/src/semantic-model/operations/operations.ts) (and profile operations in [`packages/core-v2/src/semantic-model/profile/operations/operations.ts`](../core-v2/src/semantic-model/profile/operations/operations.ts)) | [`packages/core-v2/src/semantic-model/concepts/concepts.ts`](../core-v2/src/semantic-model/concepts/concepts.ts) (profiles in [`packages/core-v2/src/semantic-model/profile/concepts/index.ts`](../core-v2/src/semantic-model/profile/concepts/index.ts)) |
| Visual model (canvas layout) | [`packages/visual-model/src/operations.ts`](../visual-model/src/operations.ts) | [`packages/visual-model/src/concepts/index.ts`](../visual-model/src/concepts/index.ts) |
| RDFS model (imported vocabulary by URL) | [`packages/model-store/src/implementation/pim-model.ts`](./src/implementation/pim-model.ts) | [`packages/model-store/src/implementation/pim-model.ts`](./src/implementation/pim-model.ts) |
| Queryable model (SGOV) | [`packages/model-store/src/implementation/async-queryable-model.ts`](./src/implementation/async-queryable-model.ts) | [`packages/model-store/src/implementation/async-queryable-model.ts`](./src/implementation/async-queryable-model.ts) |
| Structure model (PSM) | [`packages/core/src/data-psm/operation/index.ts`](../core/src/data-psm/operation/index.ts) | [`packages/core/src/data-psm/model/index.ts`](../core/src/data-psm/model/index.ts) |
| Blob model (arbitrary JSON resource, e.g. package metadata, generator config) | none (only generic `SetEntityOperation`/`UpdateEntityOperation` above) | [`packages/core/src/entity-model/utils/blob-model.ts`](../core/src/entity-model/utils/blob-model.ts) |
| Model hierarchy (read-only, see below) | none (read-only) | [`packages/model-hierarchy/src/entities.ts`](../model-hierarchy/src/entities.ts) |

### Model hierarchy

The model hierarchy (`packages/model-hierarchy`) describes how the project's semantic models relate to each other (imports/profiles). It is **read-only** for now - there are no operations to apply to it.

It is **not** wired up automatically by `createCMEModelStore`/`createDSEModelStore`. To use it, a client must manually create it on top of an existing model store with `createModelHierarchyModel(modelStore, rootProjectId)` from `@dataspecer/model-hierarchy`, then call `.initialize()` and read it via its own `getAllEntities()` / `subscribeToEntityChanges()`.
