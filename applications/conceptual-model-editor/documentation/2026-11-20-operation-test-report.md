# Operation test report

Date: 2026-11-20.

This document describes how the operations in `src/operation` are tested, the rules for writing the tests, and what is still open.

## Rules

1. **One spec per operation file**, next to the file it tests.
   `visual-model/show-visual-edge.ts` is tested by `visual-model/show-visual-edge.spec.ts`.
   The executor and the batch builder are tested in `src/operation/operation-executor.spec.ts` and `src/operation/operation-batch.spec.ts`.
2. **One `describe` per spec, named after the operation** (`describe("showVisualEdge", ...)`).
3. **Each test is self-contained**: setup, execution and assertions are all in the test body, in this order, separated by an empty line.
   A reader must understand the test without opening another file.
4. **A test fits on one screen**, at most 60 lines.
   The longest test today is 44 lines.
5. **Each test checks one behavior of the operation under test.**
   Other operations may be used for setup only when there is no simpler way.
6. **Builders hide defaults, never the scenario.**
   A builder creates one entity and returns its identifier (`createClass(context, "a")`).
   No builder creates several entities, picks counts or identifiers, or adds state the test does not mention.
   Shared scenarios ("a model with four classes in a square") are not allowed.
7. **Set up the visual state with the raw builders** (`addNode`, `addEdge`, `addProfileEdge`, `addDiagramNode`), not with `show*` operations.
   `showSemanticClass` and `showProfileClass` add related edges and attribute content on their own, which silently changes what the test checks.
   Use them only in tests of those operations.
8. **Expected failures use `context.executor.execute(...)`** and assert on `result.exception`.
   Everything else uses `run(...)`, which throws on failure so the test fails with the real error.
   When an operation must not change anything on failure, assert that too.
9. **Assert on stored state, not on generated values.**
   For example visual models generate a model color when there is none stored, so check `getModelsData()` rather than `getModelColor()`.
10. **Layout tests get a longer timeout** (`{ timeout: 30_000 }`) and assert on structure or anchored positions, never on computed coordinates.
11. **A known bug is recorded with `test.fails`** and a comment saying what is wrong and when to remove `fails`.
    The suite stays green, and the test starts failing as a reminder once the bug is fixed.

## Test utilities

Shared helpers are in `src/operation/implementation/operation-test-utilities.ts`.
They are kept out of `operation-utilities.ts`, because that file is production code imported by the operations.
The utilities do not import `vitest`, so they type check with the rest of `src/`.

| Helper | Purpose |
|---|---|
| `createOperationTestContext()` | One `InMemorySemanticModel`, two writable visual models (`visualModel`, `otherVisualModel`), an executor with all operations, and its `state`. |
| `addSemanticModel(context)`, `addVisualModel(context)` | Add another model to the executor state. |
| `addFakeExternalSemanticModel(context)` | `ExternalSemanticModel` which records `add <query>` / `release <query>` calls instead of querying a source. |
| `run(context, args)` | Execute and throw when the outcome has an exception. |
| `createClass`, `createRelationship`, `createAttribute`, `createGeneralization`, `createClassProfile` | Semantic builders, return the identifier. `createClass` takes an optional target `model`. |
| `addNode`, `addEdge`, `addProfileEdge`, `addDiagramNode` | Raw visual builders, write directly into the visual model, return the identifier. |
| `showClass`, `showClassProfile`, `showRelationship` | Run the `show*` operation; for tests of those operations and older specs. |
| `getVisualNode`, `visualRelationships`, `visualProfileRelationships` | Read the current visual state. |
| `STRING_RANGE` | Range which makes a relationship an attribute. |

## Coverage

Every operation file has a spec: 56 operations, plus the executor and the batch builder, in 58 spec files with 105 tests.

| Area | Operations | Tests |
|---|---|---|
| Executor and batch | – | 8 |
| External semantic model | 3 | 6 |
| Profile model | 7 | 9 |
| Semantic model | 8 | 13 |
| Visual model | 38 | 69 |

Scenarios from the action specs in `src/action/*.spec.ts` were rewritten as self-contained tests where an operation replaces the action: neighborhood, diagram node relationships, collapsing into a diagram node, hiding by visual and by represented, nested groups, attribute visibility and position, layout with anchored nodes, and self loops of duplicated nodes.
Nothing from `src/action/test/actions-test-suite.ts` is used.
The action specs stay until their actions are migrated and deleted.

## Known bugs

| Operation | Test | Bug |
|---|---|---|
| `profileEntities` | `profile-entities.spec.ts` – "Classes and relationships get one profile each" (`test.fails`) | The executor collects entities from both `context.semanticModels` and `context.profileModels`. The executor builds both records from the same models, so every entity is profiled twice: profiling two classes and a relationship creates four class profiles. `open-profile-model-dialog.ts` uses this operation today. |

## Open work

- **Older specs use `show*` operations for setup.**
  The specs written before the rules (`show-relationship`, `show-generalization`, `show-visual-edge`, `show-attribute`, `shift-attribute`, `toggle-anchor`, `create-visual-group`, `move-visual-nodes`, `update-visual-node-profiles`, `copy-visual-entities`, `show-profile-class`) still call `showClass` / `showClassProfile`.
  They should move to the raw builders (rule 7).
- **Branches not covered yet**, worth a test when the operation is touched:
  - `showVisualEdge` with a diagram node as an end.
  - `showEntityNeighborhood` for class profiles and their profile edges.
  - `dissolveVisualDiagramNode` with nested diagram nodes and with several nodes for the same class (edges are distributed among them).
  - `collapseIntoVisualDiagramNode` with profile edges.
  - `showSemanticModel` with relationship profiles.
  - `alignVisualNodes` with `middle` alignment and snapping to the grid.
  - `profileEntities` with generalizations and with class profiles as input.
  - `updateControlledVocabularyAssignments` with `replaces`.
- **Helper modules** (`visual-model-utilities.ts`, `visual-model-additions.ts`, `visual-model-removal.ts`) are tested only through the operations.
  `src/action/utilities.spec.ts` has tests for `getGroupMappings` and `findTopLevelGroupInVisualModel`, which exist in `visual-model-utilities.ts` as well and could be ported.
