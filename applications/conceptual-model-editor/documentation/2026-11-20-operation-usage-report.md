# Operation usage report

Date: 2026-11-20.

This report lists every place in CME `src/` that modifies a model without going through the new operations API in `src/operation`.
For each call it names the new operation that should replace it.
The inventory sections (A–D) work per call.
The [migration plan](#migration-plan) section works per action, because an action is the unit that gets migrated.

Status: the gaps found by the first version of this report are closed, see [Gaps and how they were closed](#gaps-and-how-they-were-closed).
The migration itself has not started.

## Scope and method

Four kinds of calls were searched:

- **A** – calls on the legacy `CmeModelOperationExecutor` (`src/dataspecer/cme-model/cme-model-operation-executor.ts`).
- **B** – calls on the legacy `VisualModelOperationExecutor` (`src/dataspecer/visual-model/visual-model-operation-executor.ts`), plus direct calls of the helper functions in `src/dataspecer/visual-model/operation/*` that the executor wraps.
- **C** – direct write calls on semantic / entity models: `executeOperation(s)`, `setAlias`, `setBaseIri`, `allowClass`, `releaseClass`, `allowClassSurroundings`, `releaseClassSurroundings`, `fromEntities`.
- **D** – direct write calls on `WritableVisualModel`: `addVisualNode`, `addVisualDiagramNode`, `addVisualRelationship`, `addVisualProfileRelationship`, `addVisualGroup`, `updateVisualEntity`, `deleteVisualEntity`, `setModelColor`, `deleteModelColor`, `deleteModelData`, `setView`, `setLabel`.

The search was done with grep over `src/**/*.ts(x)`.
`src/operation/**` is excluded, because it is the new API itself.
Test files (`*.spec.ts`, `src/action/test/actions-test-suite.ts`) are listed separately at the end.
Calls that go through a variable named differently than the ones searched for could be missed, but the executor and model method names are distinctive enough that this is unlikely.

Line numbers are for commit `ca0db9f00`.

## Summary

| Category | Call sites (non-test) | Covered by a new operation | Gap |
|---|---|---|---|
| A – `CmeModelOperationExecutor` | 42 | 42 | none |
| B – `VisualModelOperationExecutor` | 10 | 10 | none (was 3) |
| B – direct `visual-model/operation/*` helpers | 10 | 10 | none |
| C – semantic / entity model, user actions | 5 | 5 | none (was 1) |
| C – semantic / entity model, model lifecycle | 12 | n/a | out of scope |
| D – `WritableVisualModel`, user actions | 51 | 51 | none (was 2) |
| D – `WritableVisualModel`, infrastructure | 29 | n/a | out of scope |

## Gaps and how they were closed

1. **Connections drawn between specific visual nodes.**
   When the user drags an edge from one node to another, the legacy code adds the visual edge only between those two visual nodes (`add*WithSpecifiedVisualEnds`).
   `showRelationship` and `showGeneralization` connect *all* visual representations of both ends.
   **Closed by the new operation `showVisualEdge`** (`src/operation/implementation/visual-model/show-visual-edge.ts`).
   It takes `entity`, `visualSource` and `visualTarget`.
   For a relationship, relationship profile or generalization it adds a visual relationship, with self-loop waypoints when both ends are the same node.
   For a class profile it adds a visual profile relationship.
   An existing edge with the same ends is returned with `created: false` instead of being duplicated.
2. **Adding one class from an external model (`ExternalSemanticModel.allowClass`).**
   **Closed by the new operation `addSemanticClass`** (`src/operation/implementation/external-semantic-model/add-semantic-class.ts`).
   Removing goes through the existing `deleteSemanticEntities`, which already calls `releaseClass`.
3. **Creating a new visual model from a selection** (`createNewVisualModelAction`).
   **Closed without a new operation.**
   Creating a model and registering it in the package is model lifecycle, which operations do not do: the executor only works with the models it is given.
   The action creates the empty `WritableVisualModel` itself, builds the executor with the new model in `visualModels`, executes `copyVisualEntities` and `updateVisualModelLabel` in one batch, and only then registers the model with `useGraph.addVisualModel`.
   If the batch fails, the model is never registered, so there is nothing to roll back.
4. **Fixing missing profile edges after validation** (`visualization-validation.ts`).
   **Closed by `showVisualEdge`** with the class profile as `entity`.
5. **`showSemanticClass` was incomplete** (found while preparing the plan).
   It added a node with empty content (there was a `TODO`) and did not connect it to related entities.
   The legacy `addSemanticClassToVisualModelAction` fills the content with the class attributes and calls `addRelatedEntitiesAction`, and `showProfileClass` already did both.
   **Fixed**: `showSemanticClass` now mirrors `showProfileClass`.
   It validates the entity is a class, fills content using `getAttributesForDomain`, calls `addRelatedEntities`, and returns `created`.
   The `semanticModel` argument was removed, because the model is read from the entity, the same as in `showProfileClass`.
   It had no production callers, only tests, which were updated.

All changes are covered by tests, in the spec next to each operation file (for example `visual-model/show-visual-edge.spec.ts`).
Operations still without tests are listed in `2026-11-20-operation-test-report.md`.

## Differences to handle during the migration

- Legacy `NewCmeClassProfile` has `role` and `NewCmeRelationshipProfile` has `mandatoryLevel`.
  The new `createProfileClass` / `updateProfileClass` take `tags` instead, so the `role → tags` conversion moves to the caller.
  `createProfileRelationship` still takes `mandatoryLevel`.
- Legacy `createClassProfile` accepts an optional `order`; `createProfileClass` has no `order` argument (`updateProfileClass` does).
- Legacy controlled-vocabulary calls are per assignment (create / modify / remove).
  The new `updateControlledVocabularyAssignments` takes `previous` / `next` lists, so `apply-controlled-vocabulary-selection.ts` has to build the lists instead of issuing three kinds of calls.
- The legacy executors are synchronous and return `CmeReference` directly.
  The new executor is `async` and never throws, so every call site changes from `try / catch` to checking `outcome.status`.
- `open-edit-class-dialog.tsx` uses the `created` / `removed` result of `updateSpecialization` to update the visual model.
  The new `updateSpecialization` returns `created` / `removed` as well, so this flow maps directly.

## A – `CmeModelOperationExecutor`

The executor is created once in `src/action/actions-react-binding.tsx:584` and passed down as `cmeExecutor` to the actions below.

| Location | Legacy call | New operation |
|---|---|---|
| `src/action/apply-controlled-vocabulary-selection.ts:50` | `createControlledVocabularyAssignment` | `updateControlledVocabularyAssignments` |
| `src/action/apply-controlled-vocabulary-selection.ts:61` | `modifyControlledVocabularyAssignment` | `updateControlledVocabularyAssignments` |
| `src/action/apply-controlled-vocabulary-selection.ts:69` | `removeControlledVocabularyAssignment` | `updateControlledVocabularyAssignments` |
| `src/action/create-default-profiles.ts:174` | `createClassProfile` | `createProfileClass` |
| `src/action/create-default-profiles.ts:285` | `createRelationshipProfile` | `createProfileRelationship` |
| `src/action/create-default-profiles.ts:288` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-add-attribute-for-entity-dialog.ts:89` | `createRelationship` | `createSemanticRelationship` |
| `src/action/open-add-attribute-for-entity-dialog.ts:91` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-add-attribute-for-entity-dialog.ts:125` | `createRelationshipProfile` | `createProfileRelationship` |
| `src/action/open-add-attribute-for-entity-dialog.ts:127` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-association-dialog.tsx:51` | `createRelationship` | `createSemanticRelationship` |
| `src/action/open-create-association-dialog.tsx:53` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-attribute-dialog.tsx:44` | `createRelationship` | `createSemanticRelationship` |
| `src/action/open-create-attribute-dialog.tsx:46` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-class-dialog-with-association.ts:122` | `createRelationship` | `createSemanticRelationship` |
| `src/action/open-create-class-dialog-with-association.ts:124` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-class-dialog-with-generalization.ts:68` | `createGeneralization` | `createSemanticGeneralization` |
| `src/action/open-create-class-dialog.tsx:50` | `createClass` | `createSemanticClass` |
| `src/action/open-create-class-dialog.tsx:52` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-connection.ts:106` | `createGeneralization` | `createSemanticGeneralization` |
| `src/action/open-create-connection.ts:176` | `createRelationship` | `createSemanticRelationship` |
| `src/action/open-create-connection.ts:199` | `createGeneralization` | `createSemanticGeneralization` |
| `src/action/open-create-connection.ts:231` | `changeClassProfile` | `changeProfileClass` |
| `src/action/open-create-profile-dialog.ts:80` | `createClassProfile` | `createProfileClass` |
| `src/action/open-create-profile-dialog.ts:82` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-profile-dialog.ts:104` | `createRelationshipProfile` | `createProfileRelationship` |
| `src/action/open-create-profile-dialog.ts:106` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-create-profile-dialog.ts:125` | `createRelationshipProfile` | `createProfileRelationship` |
| `src/action/open-create-profile-dialog.ts:127` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-association-dialog.tsx:41` | `updateRelationship` | `updateSemanticRelationship` |
| `src/action/open-edit-association-dialog.tsx:45` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-association-profile-dialog.tsx:58` | `updateRelationshipProfile` | `updateProfileRelationship` |
| `src/action/open-edit-association-profile-dialog.tsx:62` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-attribute-dialog.tsx:34` | `updateRelationship` | `updateSemanticRelationship` |
| `src/action/open-edit-attribute-dialog.tsx:38` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-attribute-profile-dialog.tsx:39` | `updateRelationshipProfile` | `updateProfileRelationship` |
| `src/action/open-edit-attribute-profile-dialog.tsx:43` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-class-dialog.tsx:33` | `updateClass` | `updateSemanticClass` |
| `src/action/open-edit-class-dialog.tsx:38` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-class-profile-dialog.tsx:60` | `updateClassProfile` | `updateProfileClass` |
| `src/action/open-edit-class-profile-dialog.tsx:64` | `updateSpecialization` | `updateSpecialization` |
| `src/action/open-edit-semantic-model-dialog.ts:49` | `updateSemanticModel` | `updateSemanticModel` |

`open-modify-dialog.ts` only forwards `cmeExecutor` to the edit dialogs above.

Legacy methods with no call site outside the executor: `deleteClass`, `deleteClassProfile`, `deleteGeneralization`, `deleteRelationship`, `deleteRelationshipProfile`.
Deletion goes through `removeFromSemanticModelsAction` instead (see C).

## B – `VisualModelOperationExecutor`

### Executor calls

| Location | Legacy call | New operation |
|---|---|---|
| `src/action/add-generalization-to-visual-model.ts:23` | `addGeneralization` | `showGeneralization` |
| `src/action/add-related-entities-to-visual-model.ts:84` | `tryAddProfile` | `showRelatedEntities` (whole action) |
| `src/action/add-related-entities-to-visual-model.ts:93` | `tryAddProfile` | `showRelatedEntities` (whole action) |
| `src/action/add-related-entities-to-visual-model.ts:106` | `tryAddProfile` | `showRelatedEntities` (whole action) |
| `src/action/open-create-connection.ts:114` | `addGeneralizationWithSpecifiedVisualEnds` | `showVisualEdge` (new) |
| `src/action/open-create-connection.ts:188` | `addRelationshipWithSpecifiedVisualEnds` | `showVisualEdge` (new) |
| `src/action/open-create-connection.ts:207` | `addGeneralizationWithSpecifiedVisualEnds` | `showVisualEdge` (new) |
| `src/action/open-create-connection.ts:239` | `addProfile` (all visuals of both ends) | `updateVisualNodeProfiles` |
| `src/action/open-edit-class-dialog.tsx:45` | `deleteEntity` | `hideByRepresented` |
| `src/action/open-edit-class-dialog.tsx:47` | `addGeneralization` | `showGeneralization` |

Executors are created at `add-generalization-to-visual-model.ts:17`, `add-related-entities-to-visual-model.ts:50`, `open-create-connection.ts:72` and `open-edit-class-dialog.tsx:44`.

Legacy methods with no call site outside the executor: `addNode`, `addRelationship`, `updateProfile`, `deleteModel`.

### Direct calls of `src/dataspecer/visual-model/operation/*`

These skip the executor and call the helper functions directly.

| Location | Legacy call | New operation |
|---|---|---|
| `src/action/add-class-to-visual-model.ts:34` | `addVisualNode` | `showSemanticClass` (or `showEntities` when the position is not known) |
| `src/action/add-relationship-profile-to-visual-model.ts:64` | `addVisualRelationshipsWithSpecifiedVisualEnds` (all visuals of both ends) | `showRelationship` |
| `src/action/add-relationship-to-visual-model.ts:54` | `addVisualRelationshipsWithSpecifiedVisualEnds` (all visuals of both ends) | `showRelationship` |
| `src/action/open-create-association-dialog.tsx:61` | `addVisualRelationshipsWithSpecifiedVisualEnds` (all visuals of both ends) | `showRelationship` |
| `src/action/create-visual-diagram-node-for-existing-model.ts:31` | `addVisualDiagramNode` | `createVisualDiagramNode` |
| `src/action/create-visual-edge-endpoint-duplicate.ts:159` | `createWaypointsForSelfLoop` | pure helper, no write; `duplicateVisualNode` covers the action |
| `src/action/open-edit-class-profile-dialog.tsx:75` | `updateVisualNodeProfiles` | `updateVisualNodeProfiles` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:306` | `addVisualNode` | `dissolveVisualDiagramNode` (whole action) |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:310` | `addVisualDiagramNode` | `dissolveVisualDiagramNode` (whole action) |
| `src/context/model-context.ts:77` | `deleteEntityModel` | `removeSemanticModelFromVisualModels` |

The three `addVisualRelationshipsWithSpecifiedVisualEnds` calls above pass all visual nodes of the domain and range, so `showRelationship` does the same thing.
Only the calls in `open-create-connection.ts` pass one user-chosen node per end; those use `showVisualEdge`.

The new operations still import one legacy helper: `duplicate-visual-node.ts`, `show-visual-edge.ts` and `visual-model-additions.ts` import `add-visual-relationships.ts`.
It has to move under `src/operation` before the legacy code can be removed.
(`create-visual-group.ts`, `layout-visual-entities.ts` and `dissolve-visual-diagram-node.ts` import the operation files `./toggle-anchor` and `./layout-visual-model`, not the legacy actions of the same name.)

## C – direct calls on semantic / entity models

### User actions

| Location | Call | New operation |
|---|---|---|
| `src/action/remove-from-semantic-model.ts:24` | `InMemorySemanticModel.executeOperation(deleteEntity(...))` | `deleteSemanticEntities` |
| `src/action/remove-from-semantic-model.ts:30` | `ExternalSemanticModel.releaseClass` | `deleteSemanticEntities` |
| `src/action/open-search-external-semantic-model-dialog.ts:39` | `ExternalSemanticModel.allowClass` | `addSemanticClass` (new) |
| `src/context/model-context.ts:58` | `setAlias` in `setModelAlias` | `updateSemanticModel`, or delete the unused function |
| `src/context/model-context.ts:63` | `setBaseIri` in `setModelIri` | `updateSemanticModel`, or delete the unused function |

`setModelAlias` and `setModelIri` from `model-context.ts` have no callers outside the file.
The create-semantic-model dialog has its own unrelated `setModelAlias` for dialog state.

### Model lifecycle and loading (out of operation scope)

These calls set up a model before it is added to the package, or keep package state in sync.
No operation is expected to cover them.

| Location | Call | Purpose |
|---|---|---|
| `src/page.tsx:188`, `:242`, `:255` | `setAlias("Default local model")` | Default model on start |
| `src/dataspecer/package/package-state.ts:65` | `setAlias("My model")` | Standalone default model |
| `src/dataspecer/semantic-model/semantic-model-factory.ts:16`, `:19`, `:28` | `setAlias`, `setBaseIri`, `fromEntities` | Model factory |
| `src/dataspecer/semantic-model/semantic-model-factory.ts:46` | `allowClass` | Seed classes of the default external model |
| `src/dataspecer/package/package-api.ts:213`, `:229`, `:230` | `setAlias`, `setBaseIri` | `updateSemanticModel` / `updateInMemorySemanticModel` of the package API, no callers found outside `package-react-binding.tsx` |
| `src/header/export-management.tsx:245` | `setAlias` | Wrapper class delegating to the wrapped model |

### Legacy implementation layer

`src/dataspecer/cme-model/operation/*` (20 files) contains the bodies of the `CmeModelOperationExecutor` methods.
Every file calls `model.executeOperation(...)`, and `update-semantic-model.ts:11`, `:13` call `setAlias` / `setBaseIri`.
They are reached only through the executor (listed in A) and through tests, so they go away with the executor.

## D – direct calls on `WritableVisualModel`

### User actions

| Location | Call | New operation |
|---|---|---|
| `src/action/actions-react-binding.tsx:645` | `updateVisualEntity` (node position) in `changeNodesPositions` | `moveVisualNodes` |
| `src/action/actions-react-binding.tsx:663` | `updateVisualEntity` (waypoints) in `addWaypoint` | `addWaypoint` |
| `src/action/actions-react-binding.tsx:682` | `updateVisualEntity` (waypoints) in `deleteWaypoint` | `deleteWaypoint` |
| `src/action/actions-react-binding.tsx:703` | `updateVisualEntity` (waypoints) in `changeWaypointPositions` | `moveWaypoints` |
| `src/action/add-all-relationships.ts:75` | `addVisualRelationship` | `showDiagramNodeRelationships` |
| `src/action/add-class-profile-to-visual-model.ts:74` | `addVisualNode` | `showProfileClass` (or `showEntities` when the position is not known) |
| `src/action/add-entity-neighborhood-to-visual-model.ts:169` | `addVisualNode` | `showEntityNeighborhood` |
| `src/action/add-entity-neighborhood-to-visual-model.ts:203` | `addVisualProfileRelationship` | `showEntityNeighborhood` |
| `src/action/add-entity-neighborhood-to-visual-model.ts:215` | `addVisualProfileRelationship` | `showEntityNeighborhood` |
| `src/action/add-entity-neighborhood-to-visual-model.ts:436` | `addVisualRelationship` | `showEntityNeighborhood` |
| `src/action/add-group-to-visual-model.ts:17` | `addVisualGroup` | `createVisualGroup` |
| `src/action/add-semantic-attribute-to-visual-node.ts:30` | `updateVisualEntity` (content) | `showAttribute` |
| `src/action/add-visual-diagram-node-to-visual-model.ts:48` | `addVisualDiagramNode` | `collapseIntoVisualDiagramNode` |
| `src/action/add-visual-diagram-node-to-visual-model.ts:54` | `deleteVisualEntity` | `collapseIntoVisualDiagramNode` |
| `src/action/add-visual-diagram-node-to-visual-model.ts:103` | `updateVisualEntity` (edge ends) | `collapseIntoVisualDiagramNode` |
| `src/action/align-nodes.ts:54`, `:68`, `:83` | `updateVisualEntity` (position) | `alignVisualNodes` |
| `src/action/create-new-visual-model-from-source-visual-model.ts:47` | `setLabel` | `updateVisualModelLabel` (model created by the action, see gap 3) |
| `src/action/create-new-visual-model-from-source-visual-model.ts:67` | `addVisualNode` | `copyVisualEntities` |
| `src/action/create-new-visual-model-from-source-visual-model.ts:71` | `addVisualDiagramNode` | `copyVisualEntities` |
| `src/action/create-new-visual-model-from-source-visual-model.ts:98` | `addVisualRelationship` | `copyVisualEntities` |
| `src/action/create-new-visual-model-from-source-visual-model.ts:105` | `addVisualProfileRelationship` | `copyVisualEntities` |
| `src/action/create-visual-edge-endpoint-duplicate.ts:51` | `addVisualNode` | `duplicateVisualNode` |
| `src/action/create-visual-edge-endpoint-duplicate.ts:58` | `addVisualDiagramNode` | `duplicateVisualNode` |
| `src/action/layout-visual-model.ts:240` | `updateVisualEntity` (layout result) | `layoutVisualModel` / `layoutVisualEntities` |
| `src/action/open-create-vocabulary.ts:81` | `setModelColor` for a new model | `setModelColor` (one per visual model) |
| `src/action/open-edit-node-attributes-dialog.ts:30` | `updateVisualEntity` (content) | `updateVisualNodeContent` |
| `src/action/open-edit-semantic-model-dialog.ts:45` | `setModelColor` | `setModelColor` |
| `src/action/open-edit-visual-diagram-node-dialog.ts:41` | `setLabel` on the referenced visual model | `updateVisualModelLabel` |
| `src/action/open-edit-visual-model-dialog.ts:20` | `setLabel` | `updateVisualModelLabel` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:120` | `addVisualGroup` (temporary group for layout) | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:134` | `deleteVisualEntity` | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:180` | `deleteVisualEntity` | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:185` | `updateVisualEntity` (edge source) | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:194` | `deleteVisualEntity` | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:200` | `updateVisualEntity` (edge target) | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:328` | `addVisualRelationship` | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:342` | `addVisualProfileRelationship` | `dissolveVisualDiagramNode` |
| `src/action/put-visual-diagram-node-content-to-visual-model.ts:351` | `addVisualGroup` | `dissolveVisualDiagramNode` |
| `src/action/remove-attributes-from-node.ts:24` | `updateVisualEntity` (content) | `hideAttributes` |
| `src/action/remove-attributes-from-visual-model.ts:46` | `updateVisualEntity` (content) | `hideAttributes` |
| `src/action/remove-group-from-visual-model.ts:42` | `deleteVisualEntity` | `dissolveVisualGroup` |
| `src/action/remove-part-of-group-content.ts:53` | `updateVisualEntity` (group content) | internal step of `hideByVisual` / `dissolveVisualGroup` (`removePartOfGroupContent` in `visual-model-removal.ts`) |
| `src/action/remove-visual-entities-from-visual-model.ts:29` | `deleteVisualEntity` | `hideByVisual` / `hideByRepresented` |
| `src/action/set-attribute-position.ts:39` | `updateVisualEntity` (content) | `setAttributePosition`; the legacy action is only used by its spec |
| `src/action/shift-attribute.ts:45` | `updateVisualEntity` (content) | `shiftAttribute` |
| `src/action/toggle-anchor.ts:34`, `:44` | `updateVisualEntity` (anchor) | `toggleAnchor` |
| `src/context/model-context.ts:45` | `setModelColor` for a new model | `setModelColor` (one per visual model) |
| `src/visualization-validation.ts:168` | `addVisualProfileRelationship` (fix-up of missing profile edges) | `showVisualEdge` (new) |

### Infrastructure (out of operation scope)

These are not user actions.
They react to semantic model changes, load or migrate stored data, or build default models.

| Location | Calls | Purpose |
|---|---|---|
| `src/dataspecer/visual-model/aggregator-to-visual-model-adapter.ts:89`, `:129`, `:133`, `:189`, `:201`, `:213`, `:235`, `:251` | `updateVisualEntity`, `deleteVisualEntity` | Keep the visual model consistent when semantic entities change or are removed |
| `src/dataspecer/visual-model/visual-model-sanitizer.ts:27`, `:34` | `updateVisualEntity`, `deleteVisualEntity` | Clean invalid entities on load |
| `src/dataspecer/visual-model/visual-model-v0-to-v1.ts:46`–`:193` (15 calls) | `deleteVisualEntity`, `updateVisualEntity`, `addVisualProfileRelationship`, `deleteModelData` | Data format migration |
| `src/dataspecer/visual-model/visual-model-factory.ts:24`, `:36`, `:41` | `setModelColor`, `setLabel` | Create a default visual model |
| `src/dataspecer/package/package-api.ts:115` | `setLabel` | `updateVisualModel` of the package API, no callers found outside `package-react-binding.tsx` |

The aggregator adapter changes the visual model as a side effect of semantic changes.
When semantic changes move to operations, decide whether the adapter stays a listener or the semantic operations update visual models themselves.
Otherwise a single user action produces two kinds of changes, which makes undo / history harder.

### Legacy implementation layer

`src/dataspecer/visual-model/operation/*` is the body of `VisualModelOperationExecutor` plus the helpers listed in B.

| Location | Call |
|---|---|
| `add-visual-diagram-node.ts:8` | `addVisualDiagramNode` |
| `add-visual-node-profile.ts:25` | `addVisualProfileRelationship` |
| `add-visual-node.ts:13` | `addVisualNode` |
| `add-visual-relationships.ts:48` | `addVisualRelationship` |
| `delete-entity-model.ts:8` | `deleteModelData` |
| `delete-visual-entity.ts:11` | `deleteVisualEntity` |
| `update-visual-node-profiles.ts:33`, `:54` | `addVisualProfileRelationship`, `deleteVisualEntity` |

## Already on the new executor

| Location | Operation |
|---|---|
| `src/action/actions-react-binding.tsx:1120` | `addSemanticClassSurroundings` |
| `src/action/actions-react-binding.tsx:1138` | `releaseSemanticClassSurroundings` |
| `src/action/open-profile-model-dialog.ts:33` | `profileEntities` |
| `src/action/utilities/visual-color-utilities.ts:44` | `setVisualEntityColor` |

## Operations without a one-to-one legacy call

`showSemanticModel`, `hideSemanticModel` and `showEntities` do not replace any single call listed above.
They replace whole actions whose writes are already listed in B and D:

- `showSemanticModel` replaces `addEntitiesFromSemanticModelToVisualModelAction` (`src/action/add-entities-from-semantic-model-to-visual-model.ts`).
- `hideSemanticModel` replaces `removeEntitiesInSemanticModelFromVisualModel` (`src/action/actions-react-binding.tsx:988`), which ends in `remove-visual-entities-from-visual-model.ts`.
- `showEntities` replaces `addSemanticEntitiesToVisualModelAction` (`src/action/add-semantic-entities-to-visual-model.ts`).

## Migration plan

The plan works per action.
Each row says which calls from the inventory the action replaces and which new operations it executes instead.
"Batch" means the operations go into one `executor.batch()`, so they share one execution context and stop at the first failure.

### Prerequisites

These come before any action is migrated.

1. **One executor for the whole application.**
   Today `actions-react-binding.tsx` builds a new executor in each of three places (`:1115`, `:1133`, `:1150`), and it passes `semanticModelsList` in one place and `[...semanticModels.values()]` in the others.
   Provide a single executor through a React context, with the state reading `classes.semanticModelsList` and `classes.visualModelsList`.
   Actions take the executor instead of `cmeExecutor`.
2. **One way to report an outcome.**
   The new executor never throws.
   Add a helper that turns `outcome.exception` into a notification, so actions do not repeat the `try / catch` they use today.
3. **Move the legacy helpers the new operations import.**
   `createWaypointsForSelfLoop` and `addVisualRelationshipsWithSpecifiedVisualEnds` (`dataspecer/visual-model/operation/add-visual-relationships.ts`) move under `src/operation/implementation/visual-model/`.
   They are imported by `duplicate-visual-node.ts`, `show-visual-edge.ts` and `visual-model-additions.ts`, so deleting the legacy helpers without moving them breaks the new operations.
   This is the only legacy import left in `src/operation/`.
4. **Decide the role of `aggregator-to-visual-model-adapter.ts`.**
   It removes visuals of deleted entities and moves attributes between nodes when a domain changes.
   Recommendation: keep it as a listener for now, so semantic operations do not need to know about every visual model, and revisit it with undo / history.

### Order

1. Pure visual actions: they touch only the visual model, have direct counterparts, and are easy to test by hand.
2. Edit dialogs: one semantic update plus `updateSpecialization`.
3. Create dialogs and connections: they need the result of the semantic step to drive the visual step.
4. Deletion and external models.
5. Model lifecycle bits (`open-create-vocabulary`, `model-context`, new visual model).
6. Cleanup: delete the legacy executors, `dataspecer/cme-model/operation/*`, `dataspecer/visual-model/operation/*`, the replaced actions, and port `actions-test-suite.ts`.

### 1. Visual actions

| Action | Replaces | New operations | Notes |
|---|---|---|---|
| `changeNodesPositions` in `actions-react-binding.tsx` | D `:645` | `moveVisualNodes` | One operation for all changed nodes; keeps anchors. |
| `addWaypoint` in `actions-react-binding.tsx` | D `:663` | `addWaypoint` | |
| `deleteWaypoint` in `actions-react-binding.tsx` | D `:682` | `deleteWaypoint` | |
| `changeWaypointPositions` in `actions-react-binding.tsx` | D `:703` | `moveWaypoints` | Drop the leftover `console.log`. |
| `align-nodes.ts` | D `:54`, `:68`, `:83` | `alignVisualNodes` | Pass `nodeDimensions` from the diagram. |
| `toggle-anchor.ts` | D `:34`, `:44` | `toggleAnchor` | |
| `add-group-to-visual-model.ts` | D `:17` | `createVisualGroup` | |
| `remove-group-from-visual-model.ts` | D `:42` | `dissolveVisualGroup` | |
| `remove-from-visual-model-by-visual.ts` → `remove-visual-entities-from-visual-model.ts`, `remove-part-of-group-content.ts` | D `:29`, `:53` | `hideByVisual` | Group content cleanup is inside the operation. |
| `remove-from-visual-model-by-represented.ts` | D (through `remove-visual-entities-from-visual-model.ts:29`) | `hideByRepresented` | |
| `remove-attributes-from-node.ts` | D `:24` | `hideAttributes` with `visualNode` set | |
| `remove-attributes-from-visual-model.ts` | D `:46` | `hideAttributes` with `visualNode: null` | |
| `add-semantic-attribute-to-visual-node.ts`, `add-semantic-attribute-to-visual-model.ts` | D `:30` | `showAttribute` | `visualNode: null` adds to all nodes of the domain. |
| `shift-attribute.ts` | D `:45` | `shiftAttribute` | |
| `set-attribute-position.ts` | D `:39` | `setAttributePosition` | Legacy action is only used by its spec; delete it with the spec. |
| `open-edit-node-attributes-dialog.ts` | D `:30` | `updateVisualNodeContent` | |
| `add-class-to-visual-model.ts` | B `:34` + `addRelatedEntitiesAction` | `showSemanticClass` when the position is known, `showEntities` with `position: null` otherwise | `showSemanticClass` now adds content and related edges itself. `showEntities` replaces `findPositionForNewNodeUsingLayouting`. |
| `add-class-profile-to-visual-model.ts` | D `:74` + `addRelatedEntitiesAction` | `showProfileClass` / `showEntities` | Same as above. |
| `add-relationship-to-visual-model.ts`, `add-relationship-profile-to-visual-model.ts` | B `:54`, `:64` | `showRelationship` | `shown: false` replaces the "ends are not in the visual model" error. |
| `add-generalization-to-visual-model.ts` | B `:23` | `showGeneralization` | |
| `add-related-entities-to-visual-model.ts` | B `:84`, `:93`, `:106` | `showRelatedEntities` | Its two callers become `showSemanticClass` / `showProfileClass`, which include it, so it may have no caller left. |
| `add-semantic-entities-to-visual-model.ts` | B and D through the helpers above | `showEntities` | |
| `add-entities-from-semantic-model-to-visual-model.ts` | B and D through the helpers above | `showSemanticModel` | |
| `removeEntitiesInSemanticModelFromVisualModel` in `actions-react-binding.tsx:988` | D through `remove-visual-entities-from-visual-model.ts` | `hideSemanticModel` | |
| `add-entity-neighborhood-to-visual-model.ts` | D `:169`, `:203`, `:215`, `:436` | `showEntityNeighborhood` | |
| `add-all-relationships.ts` | D `:75` | `showDiagramNodeRelationships` | |
| `create-visual-edge-endpoint-duplicate.ts` | D `:51`, `:58`, B `:159` | `duplicateVisualNode` | |
| `create-visual-diagram-node-for-existing-model.ts` | B `:31` | `createVisualDiagramNode` | |
| `put-visual-diagram-node-content-to-visual-model.ts` | B `:306`, `:310`, D `:120`–`:351` | `dissolveVisualDiagramNode` | Pass `nodeDimensions`. |
| `layout-visual-model.ts`, `layout-selection.ts`, `open-layout-visual-model-dialog.tsx` | D `:240` | `layoutVisualModel` / `layoutVisualEntities` | The "outsiders" branch (`addClassOrClassProfileToVisualModel`) needs checking against `layoutVisualEntities`. |
| `open-edit-visual-model-dialog.ts` | D `:20` | `updateVisualModelLabel` | The visual options stay application state. |
| `open-edit-visual-diagram-node-dialog.ts` | D `:41` | `updateVisualModelLabel` on the referenced model | |
| `visualization-validation.ts` | D `:168` | `showVisualEdge`, one per missing profile edge, in a batch | The removal of invalid entities already goes through `removeFromVisualModelByVisual` → `hideByVisual`. |

### 2. Edit dialogs

| Action | Replaces | New operations | Notes |
|---|---|---|---|
| `open-edit-class-dialog.tsx` | A `:33`, `:38`, B `:45`, `:47` | Step 1 batch: `updateSemanticClass`, `updateSpecialization`. Step 2 batch: `hideByRepresented` (removed generalizations), `showGeneralization` per created one | Step 2 needs the `created` / `removed` result of step 1, because `updateSpecialization` generates identifiers when it runs. |
| `open-edit-class-profile-dialog.tsx` | A `:60`, `:64`, B `:75` | Batch: `updateProfileClass`, `updateSpecialization`, `updateVisualNodeProfiles`, `updateControlledVocabularyAssignments` | `role` becomes part of `tags`. The vocabulary step replaces `apply-controlled-vocabulary-selection.ts`. |
| `apply-controlled-vocabulary-selection.ts` | A `:50`, `:61`, `:69` | `updateControlledVocabularyAssignments` | Map own `VocabularyItemState` items to `{ assignment: entityId, vocabulary, qualifier, replaces }` for both `previous` and `next`; the operation computes the diff. |
| `open-edit-association-dialog.tsx`, `open-edit-attribute-dialog.tsx` | A `:41`, `:45` / `:34`, `:38` | Batch: `updateSemanticRelationship`, `updateSpecialization` | |
| `open-edit-association-profile-dialog.tsx`, `open-edit-attribute-profile-dialog.tsx` | A `:58`, `:62` / `:39`, `:43` | Batch: `updateProfileRelationship`, `updateSpecialization` | |
| `open-edit-semantic-model-dialog.ts` | A `:49`, D `:45` | Batch: `updateSemanticModel`, `setModelColor` | `alias` comes from `name[CmeSemanticModelNameLanguage]`, as in the legacy operation. |
| `open-modify-dialog.ts` | – | – | Only forwards the executor. |

### 3. Create dialogs and connections

Create operations prepare the new identifier in `create`, so a create and the operations using its identifier fit in one batch.
`updateSpecialization` and `profileEntities` generate identifiers while they run, so anything that needs their result is a second step.

| Action | Replaces | New operations | Notes |
|---|---|---|---|
| `open-create-class-dialog.tsx` | A `:50`, `:52`, B `add-class-to-visual-model.ts:34` | Batch: `createSemanticClass`, `updateSpecialization`, `showSemanticClass` (or `showEntities` when `position` is null) | `onConfirmCallback` receives the identifier from the `createSemanticClass` arguments. |
| `open-create-class-dialog-with-generalization.ts` | A `:68` | `createSemanticGeneralization`, `showGeneralization` | Runs in the callback of the class dialog. |
| `open-create-class-dialog-with-association.ts` | A `:122`, `:124` | Batch: `createSemanticRelationship`, `updateSpecialization`, `showRelationship` | |
| `open-create-class-dialog-with-derived-model.tsx` | – | – | Only forwards the executor. |
| `open-create-association-dialog.tsx` | A `:51`, `:53`, B `:61` | Batch: `createSemanticRelationship`, `updateSpecialization`, `showRelationship` | |
| `open-create-attribute-dialog.tsx` | A `:44`, `:46` | Batch: `createSemanticRelationship`, `updateSpecialization`, `showAttribute` with `visualNode: null` | |
| `open-add-attribute-for-entity-dialog.ts` | A `:89`, `:91`, `:125`, `:127` | Attribute: as above. Attribute profile: batch `createProfileRelationship`, `updateSpecialization`, `showAttribute` | |
| `open-create-profile-dialog.ts` | A `:80`–`:127` | Class profile: batch `createProfileClass`, `updateSpecialization`, `showProfileClass` / `showEntities`. Relationship profile: batch `createProfileRelationship`, `updateSpecialization`, `showRelationship` | `role` becomes part of `tags`. |
| `create-default-profiles.ts` | A `:174`, `:285`, `:288` | Step 1: `profileEntities`. Step 2: `showEntities` for the created class profiles, `showRelationship` per created relationship profile | Decided: migrate as is. `profileEntities` has no controlled-vocabulary handling yet, while the legacy action receives `availableVocabularies`; this is work in progress and the implementation is expected from another team member. |
| `open-create-connection.ts` – association | A `:176`, B `:188` | Batch: `createSemanticRelationship`, `showVisualEdge` with the two chosen nodes | |
| `open-create-connection.ts` – generalization | A `:106`, `:199`, B `:114`, `:207` | Batch: `createSemanticGeneralization`, `showVisualEdge` with the two chosen nodes | |
| `open-create-connection.ts` – profile | A `:231`, B `:239` | Batch: `changeProfileClass` (append to `profileOf`), `updateVisualNodeProfiles` | Decided: keep the legacy behavior of connecting all visuals, do not use `showVisualEdge` here. |

### 4. Deletion and external models

| Action | Replaces | New operations | Notes |
|---|---|---|---|
| `deleteFromSemanticModels` in `actions-react-binding.tsx` (`:931`–`:952`) with `remove-from-semantic-model.ts` | C `:24`, `:30` | Batch: `hideByRepresented` (non-attributes), `hideAttributes` (attributes), `deleteSemanticEntities` | Other visual models are cleaned by the aggregator adapter (prerequisite 4). |
| `open-search-external-semantic-model-dialog.ts` | C `:39` | Batch: `addSemanticClass` per found IRI | `model.search` is a read and stays in the action. |
| `addSemanticClassSurroundings`, `releaseSemanticClassSurroundings` in `actions-react-binding.tsx` | – | already migrated | Switch to the shared executor (prerequisite 1). |

### 5. Model lifecycle

| Action | Replaces | New operations | Notes |
|---|---|---|---|
| `open-create-vocabulary.ts` | D `:81` | Batch: `setModelColor` per visual model | After the semantic model is registered. |
| `addModel` in `model-context.ts` | D `:45` | Batch: `setModelColor` per visual model | Same. |
| `deleteModel` in `model-context.ts` | B `:77` | `removeSemanticModelFromVisualModels`, then `context.deleteModel` | |
| `setModelAlias`, `setModelIri` in `model-context.ts` | C `:58`, `:63` | none | No callers; delete them. |
| `create-new-visual-model-from-source-visual-model.ts`, `open-create-visual-model-dialog.ts` | D `:47`–`:105` | Create the empty model, then batch `copyVisualEntities`, `updateVisualModelLabel` with the new model in the executor state, then `useGraph.addVisualModel` | See gap 3. |
| `add-visual-diagram-node-to-visual-model.ts` | D `:48`, `:54`, `:103` | Create the empty model, then batch `collapseIntoVisualDiagramNode`, `updateVisualModelLabel`, then register the model | `collapseIntoVisualDiagramNode` copies the content itself, so the action no longer calls `createNewVisualModelAction` with nodes. |

### Stays outside operations

The infrastructure calls in C and D stay as they are: model factories, default models in `page.tsx` and `package-state.ts`, `package-api.ts`, `export-management.tsx`, the aggregator adapter, the sanitizer and the v0 → v1 migration.

## Tests

Tests build their fixtures by writing to models directly.
They do not need migrating with the production code, but they will need updates when legacy helpers are removed.

| File | Direct calls |
|---|---|
| `src/action/test/actions-test-suite.ts` | `addVisualNode` (`:550`, `:931`), `addVisualDiagramNode` helper (`:570`), `createCmeRelationshipProfile` (`:677`), `createCmeClassProfile` (`:738`), `createCmeModelOperationExecutor` + `createRelationshipProfile` (`:846`, `:847`), `addVisualRelationshipsWithSpecifiedVisualEnds` (`:1018`) |
| `src/action/add-all-relationships.spec.ts:74` | `deleteVisualEntity` |
| `src/action/add-relationship-to-visual-model.spec.ts:462`, `:626` | `addVisualNode`, `addVisualRelationshipsWithSpecifiedVisualEnds` |
| `src/action/remove-part-of-group-content.spec.ts:227` | `addVisualNode` |
| `src/action/shift-attribute.spec.ts:162` | `addVisualNode` |
| `src/context/page-aggregator-sync.spec.ts:165` | `addVisualNode` |
