import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import {
  createRemoveEntityOperation,
  createSetEntityOperation,
  createUndoOperation,
  createUpdateEntityOperation,
  type Operation,
} from "@dataspecer/core/operation";
import { describe, expect, test } from "vitest";
import { applyUndoOperationToModelEntities, type UndoHistoryEntry } from "./model-operations.ts";

const MODEL = "model";
const TYPE = "test-type";

function entity(id: string, data: Record<string, unknown> = {}): Entity {
  return { id, type: [], ...data };
}

/**
 * Builds the history entries by replaying each transaction's operations from
 * an empty model, recording the down events the backend would have recorded.
 * Returns the history together with the resulting (tip) state.
 */
function buildHistory(transactions: { clientId: string; operations: Operation[] }[]): { history: UndoHistoryEntry[]; state: EntityRecord } {
  const history: UndoHistoryEntry[] = [];
  let state: EntityRecord = {};

  for (const transaction of transactions) {
    let next = state;
    const downEvents: Record<string, Entity | null> = {};

    for (const operation of transaction.operations) {
      const working = { ...next };
      if (operation.type === "undo") {
        const result = applyUndoOperationToModelEntities(MODEL, TYPE, working, operation as never, history);
        expect(result).not.toBeNull();
        next = result!;
      } else {
        if ("entity" in operation) {
          working[(operation as never as { entity: Entity }).entity.id] = (operation as never as { entity: Entity }).entity;
        } else if ("update" in operation) {
          const update = (operation as never as { update: Entity }).update;
          if (working[update.id]) {
            working[update.id] = { ...working[update.id]!, ...update };
          }
        } else if ("entityId" in operation) {
          delete working[(operation as never as { entityId: string }).entityId];
        }
        next = working;
      }
    }

    for (const id of new Set([...Object.keys(state), ...Object.keys(next)])) {
      if (state[id] !== next[id]) {
        downEvents[id] = state[id] ?? null;
      }
    }

    history.push({ clientId: transaction.clientId, operations: transaction.operations, downEvents });
    state = next;
  }

  return { history, state };
}

describe(applyUndoOperationToModelEntities, () => {
  test("undoes the last transaction", () => {
    const { history, state } = buildHistory([
      { clientId: "A", operations: [createSetEntityOperation(entity("e1", { value: "a" }))] },
      { clientId: "B", operations: [createUpdateEntityOperation({ id: "e1", value: "b" } as never)] },
    ]);

    const result = applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("B"), history);
    expect(result).toEqual({ e1: entity("e1", { value: "a" }) });
  });

  test("redo: undoing an undo restores the cancelled transaction", () => {
    const { history, state } = buildHistory([
      { clientId: "A", operations: [createSetEntityOperation(entity("e1"))] },
      { clientId: "U1", operations: [createUndoOperation("A")] },
    ]);
    expect(state).toEqual({});

    const result = applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("U1"), history);
    expect(result).toEqual({ e1: entity("e1") });
  });

  test("cancels a transaction in the middle and replays the rest", () => {
    // C creates e2, D updates it. Undoing C replays D on a state where e2
    // does not exist, so the update is ignored and e2 disappears entirely.
    const { history, state } = buildHistory([
      { clientId: "A", operations: [createSetEntityOperation(entity("e1", { value: "a" }))] },
      { clientId: "C", operations: [createSetEntityOperation(entity("e2", { value: "c" }))] },
      { clientId: "D", operations: [createUpdateEntityOperation({ id: "e2", value: "d" } as never)] },
      { clientId: "E", operations: [createSetEntityOperation(entity("e3"))] },
    ]);

    const result = applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("C"), history);
    expect(result).toEqual({ e1: entity("e1", { value: "a" }), e3: entity("e3") });
  });

  test("cancelling a transaction whose target precedes an earlier undo", () => {
    // A and B are each cancelled by a different undo; the replay must apply
    // the earlier undo's cancellation as well, leaving nothing.
    const { history, state } = buildHistory([
      { clientId: "A", operations: [createSetEntityOperation(entity("e1"))] },
      { clientId: "B", operations: [createSetEntityOperation(entity("e2"))] },
      { clientId: "U1", operations: [createUndoOperation("A")] },
    ]);
    expect(state).toEqual({ e2: entity("e2") });

    const result = applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("B"), history);
    expect(result).toEqual({});
  });

  test("undo of a remove restores the entity", () => {
    const { history, state } = buildHistory([
      { clientId: "A", operations: [createSetEntityOperation(entity("e1", { value: "a" }))] },
      { clientId: "B", operations: [createRemoveEntityOperation("e1")] },
    ]);
    expect(state).toEqual({});

    const result = applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("B"), history);
    expect(result).toEqual({ e1: entity("e1", { value: "a" }) });
  });

  test("returns null for an unknown transaction", () => {
    const { history, state } = buildHistory([{ clientId: "A", operations: [createSetEntityOperation(entity("e1"))] }]);

    expect(applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("missing"), history)).toBeNull();
  });

  test("returns null when a transaction to rewind through has no recorded events", () => {
    const { history, state } = buildHistory([
      { clientId: "A", operations: [createSetEntityOperation(entity("e1"))] },
      { clientId: "B", operations: [createSetEntityOperation(entity("e2"))] },
    ]);
    history[1] = { ...history[1]!, downEvents: null };

    expect(applyUndoOperationToModelEntities(MODEL, TYPE, state, createUndoOperation("A"), history)).toBeNull();
  });
});
