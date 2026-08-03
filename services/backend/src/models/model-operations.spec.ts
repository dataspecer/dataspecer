import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import {
  createRemoveEntityOperation,
  createSetEntityOperation,
  createUndoOperation,
  createUpdateEntityOperation,
  type Operation,
  type OperationInModel,
} from "@dataspecer/core/operation";
import { createCreateModelOperation, createCreateProjectOperation, createRemoveModelOperation, type PackageEntity, type ProjectModelEntity } from "@dataspecer/core/project-model";
import { describe, expect, test } from "vitest";
import { PROJECT_MODEL_ID } from "./model-id.ts";
import { applyOperationsToModelEntities, applyUndoOperationToModels, groupTransactionOperations, type UndoHistoryTransaction } from "./model-operations.ts";
import { NAMED_BLOB_STORE_TYPE } from "./model-types.ts";
import type { TransactionEvents } from "./transaction-model.ts";

const PROJECT = "project";
const MODEL_A = "model-a";
const MODEL_B = "model-b";

function entity(id: string, data: Record<string, unknown> = {}): Entity {
  return { id, type: [], ...data };
}

function inA(...operations: Operation[]): OperationInModel[] {
  return operations.map((operation) => ({ modelId: MODEL_A, operation }));
}

function inB(...operations: Operation[]): OperationInModel[] {
  return operations.map((operation) => ({ modelId: MODEL_B, operation }));
}

function inProject(...operations: Operation[]): OperationInModel[] {
  return operations.map((operation) => ({ modelId: PROJECT_MODEL_ID, operation }));
}

/**
 * Replays each transaction from empty models the same way the backend does,
 * recording the down events it would have recorded. Returns the history
 * together with the resulting (tip) states of all models.
 */
async function buildHistory(transactions: { clientId: string; operations: OperationInModel[] }[]): Promise<{
  history: UndoHistoryTransaction[];
  states: Record<ModelIdentifier, EntityRecord>;
}> {
  const history: UndoHistoryTransaction[] = [];
  let states: Record<ModelIdentifier, EntityRecord> = {};

  for (const transaction of transactions) {
    const { undoOperations, groups } = groupTransactionOperations(transaction.operations);
    const next: Record<ModelIdentifier, EntityRecord> = { ...states };

    for (const undoOperation of undoOperations) {
      const result = await applyUndoOperationToModels(undoOperation, history, async (modelId) => next[modelId] ?? {});
      expect(result).not.toBeNull();
      Object.assign(next, result);
    }

    for (const [modelId, operations] of groups) {
      const modelType = (next[PROJECT_MODEL_ID]?.[modelId] as ProjectModelEntity | undefined)?.modelType ?? NAMED_BLOB_STORE_TYPE;
      const projectEntitiesBefore = next[PROJECT_MODEL_ID] ?? {};
      next[modelId] = applyOperationsToModelEntities(modelId, modelType, next[modelId] ?? {}, operations);
      if (modelId === PROJECT_MODEL_ID) {
        // The content of a removed model is deleted together with it.
        for (const removedId of Object.keys(projectEntitiesBefore).filter((id) => next[PROJECT_MODEL_ID]![id] === undefined)) {
          next[removedId] = {};
        }
      }
    }

    const downEvents: TransactionEvents = {};
    for (const modelId of new Set([...Object.keys(states), ...Object.keys(next)])) {
      const down: Record<string, Entity | null> = {};
      for (const entityId of new Set([...Object.keys(states[modelId] ?? {}), ...Object.keys(next[modelId] ?? {})])) {
        if (states[modelId]?.[entityId] !== next[modelId]?.[entityId]) {
          down[entityId] = states[modelId]?.[entityId] ?? null;
        }
      }
      if (Object.keys(down).length > 0) {
        downEvents[modelId] = down;
      }
    }

    history.push({ clientId: transaction.clientId, operations: transaction.operations, downEvents });
    states = next;
  }

  return { history, states };
}

/** History prefix creating the project with one semantic model in it. */
const setUpProject = [
  { clientId: "P", operations: inProject(createCreateProjectOperation(PROJECT), createCreateModelOperation(PROJECT, LOCAL_SEMANTIC_MODEL, MODEL_A)) },
];

describe(applyUndoOperationToModels, () => {
  test("undoes the last transaction", async () => {
    const { history, states } = await buildHistory([
      { clientId: "A", operations: inA(createSetEntityOperation(entity("e1", { value: "a" }))) },
      { clientId: "B", operations: inA(createUpdateEntityOperation({ id: "e1", value: "b" } as never)) },
    ]);

    const result = await applyUndoOperationToModels(createUndoOperation("B"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[MODEL_A]).toEqual({ e1: entity("e1", { value: "a" }) });
  });

  test("cancels the transaction in every model it touched", async () => {
    const { history, states } = await buildHistory([
      { clientId: "A", operations: [...inA(createSetEntityOperation(entity("e1"))), ...inB(createSetEntityOperation(entity("e2")))] },
      { clientId: "B", operations: inB(createSetEntityOperation(entity("e3"))) },
    ]);

    const result = await applyUndoOperationToModels(createUndoOperation("A"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[MODEL_A]).toEqual({});
    expect(result?.[MODEL_B]).toEqual({ e3: entity("e3") });
  });

  test("redo: undoing an undo restores the cancelled transaction", async () => {
    const { history, states } = await buildHistory([
      { clientId: "A", operations: inA(createSetEntityOperation(entity("e1"))) },
      { clientId: "U1", operations: inProject(createUndoOperation("A")) },
    ]);
    expect(states[MODEL_A]).toEqual({});

    const result = await applyUndoOperationToModels(createUndoOperation("U1"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[MODEL_A]).toEqual({ e1: entity("e1") });
  });

  test("cancels a transaction in the middle and replays the rest", async () => {
    // C creates e2, D updates it. Undoing C replays D on a state where e2
    // does not exist, so the update is ignored and e2 disappears entirely.
    const { history, states } = await buildHistory([
      { clientId: "A", operations: inA(createSetEntityOperation(entity("e1", { value: "a" }))) },
      { clientId: "C", operations: inA(createSetEntityOperation(entity("e2", { value: "c" }))) },
      { clientId: "D", operations: inA(createUpdateEntityOperation({ id: "e2", value: "d" } as never)) },
      { clientId: "E", operations: inA(createSetEntityOperation(entity("e3"))) },
    ]);

    const result = await applyUndoOperationToModels(createUndoOperation("C"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[MODEL_A]).toEqual({ e1: entity("e1", { value: "a" }), e3: entity("e3") });
  });

  test("cancelling a transaction whose target precedes an earlier undo", async () => {
    // A and B are each cancelled by a different undo; the replay must apply
    // the earlier undo's cancellation as well, leaving nothing.
    const { history, states } = await buildHistory([
      { clientId: "A", operations: inA(createSetEntityOperation(entity("e1"))) },
      { clientId: "B", operations: inA(createSetEntityOperation(entity("e2"))) },
      { clientId: "U1", operations: inProject(createUndoOperation("A")) },
    ]);
    expect(states[MODEL_A]).toEqual({ e2: entity("e2") });

    const result = await applyUndoOperationToModels(createUndoOperation("B"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[MODEL_A]).toEqual({});
  });

  test("undo of a remove restores the entity", async () => {
    const { history, states } = await buildHistory([
      { clientId: "A", operations: inA(createSetEntityOperation(entity("e1", { value: "a" }))) },
      { clientId: "B", operations: inA(createRemoveEntityOperation("e1")) },
    ]);
    expect(states[MODEL_A]).toEqual({});

    const result = await applyUndoOperationToModels(createUndoOperation("B"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[MODEL_A]).toEqual({ e1: entity("e1", { value: "a" }) });
  });

  test("undo of a model creation drops the model from the project structure", async () => {
    const { history, states } = await buildHistory([
      ...setUpProject,
      {
        clientId: "B",
        operations: [...inProject(createCreateModelOperation(PROJECT, LOCAL_SEMANTIC_MODEL, MODEL_B)), ...inB(createSetEntityOperation(entity("e1")))],
      },
    ]);
    expect(states[PROJECT_MODEL_ID]?.[MODEL_B]).toBeDefined();

    const result = await applyUndoOperationToModels(createUndoOperation("B"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[PROJECT_MODEL_ID]?.[MODEL_B]).toBeUndefined();
    expect((result?.[PROJECT_MODEL_ID]?.[PROJECT] as PackageEntity).subModels).toEqual([MODEL_A]);
    expect(result?.[MODEL_B]).toEqual({});
  });

  test("undo of a model removal restores the model and its content", async () => {
    const { history, states } = await buildHistory([
      ...setUpProject,
      { clientId: "B", operations: inA(createSetEntityOperation(entity("e1", { value: "a" }))) },
      { clientId: "C", operations: inProject(createRemoveModelOperation(MODEL_A)) },
    ]);
    expect(states[PROJECT_MODEL_ID]?.[MODEL_A]).toBeUndefined();
    expect(states[MODEL_A]).toEqual({});

    const result = await applyUndoOperationToModels(createUndoOperation("C"), history, async (modelId) => states[modelId] ?? {});
    expect((result?.[PROJECT_MODEL_ID]?.[MODEL_A] as ProjectModelEntity).modelType).toBe(LOCAL_SEMANTIC_MODEL);
    expect(result?.[MODEL_A]).toEqual({ e1: entity("e1", { value: "a" }) });
  });

  test("a model removed after the undone transaction stays removed", async () => {
    const { history, states } = await buildHistory([
      ...setUpProject,
      { clientId: "B", operations: inA(createSetEntityOperation(entity("e1"))) },
      { clientId: "C", operations: inA(createSetEntityOperation(entity("e2"))) },
      { clientId: "D", operations: inProject(createRemoveModelOperation(MODEL_A)) },
    ]);

    const result = await applyUndoOperationToModels(createUndoOperation("B"), history, async (modelId) => states[modelId] ?? {});
    expect(result?.[PROJECT_MODEL_ID]?.[MODEL_A]).toBeUndefined();
    expect(result?.[MODEL_A]).toEqual({});
  });

  test("returns null for an unknown transaction", async () => {
    const { history, states } = await buildHistory([{ clientId: "A", operations: inA(createSetEntityOperation(entity("e1"))) }]);

    expect(await applyUndoOperationToModels(createUndoOperation("missing"), history, async (modelId) => states[modelId] ?? {})).toBeNull();
  });

  test("returns null when a transaction to rewind through has no recorded events", async () => {
    const { history, states } = await buildHistory([
      { clientId: "A", operations: inA(createSetEntityOperation(entity("e1"))) },
      { clientId: "B", operations: inA(createSetEntityOperation(entity("e2"))) },
    ]);
    history[1] = { ...history[1]!, downEvents: null };

    expect(await applyUndoOperationToModels(createUndoOperation("A"), history, async (modelId) => states[modelId] ?? {})).toBeNull();
  });
});
