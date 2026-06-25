import type { EntityChange } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import type { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship } from "../concepts/index.ts";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "../concepts/index.ts";
import { createClass, createGeneralization, createRelationship, deleteEntity, modifyClass, modifyGeneralization, modifyRelation } from "./operations.ts";

export interface SemanticModelOperationsResult {
  operations: Operation[];
  remainingChanges: EntityChange[];
}

/**
 * Converts entity changes into semantic model operations, filtering out changes
 * not relevant to the semantic model (classes, relationships, generalizations).
 * Remaining changes are returned so another layer can handle them.
 *
 * Operations are ordered to avoid acting on non-existing entities: create
 * classes → create relationships/generalizations → modify all → delete
 * relationships/generalizations → delete classes.
 */
export function changesToSemanticModelOperations(changes: EntityChange[]): SemanticModelOperationsResult {
  const remainingChanges: EntityChange[] = [];

  const createClassOps: Operation[] = [];
  const createRelGenOps: Operation[] = [];
  const modifyOps: Operation[] = [];
  const deleteRelGenOps: Operation[] = [];
  const deleteClassOps: Operation[] = [];

  for (const change of changes) {
    const entity = change.next ?? change.previous;

    if (isSemanticModelClass(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as SemanticModelClass;
        createClassOps.push(createClass(rest));
      } else if (change.next === null) {
        deleteClassOps.push(deleteEntity(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as SemanticModelClass;
        modifyOps.push(modifyClass(id, rest));
      }
    } else if (isSemanticModelRelationship(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as SemanticModelRelationship;
        createRelGenOps.push(createRelationship(rest));
      } else if (change.next === null) {
        deleteRelGenOps.push(deleteEntity(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as SemanticModelRelationship;
        modifyOps.push(modifyRelation(id, rest));
      }
    } else if (isSemanticModelGeneralization(entity)) {
      if (change.previous === null) {
        const { type: _, id, ...rest } = change.next as SemanticModelGeneralization;
        const op = createGeneralization(rest);
        op.entity.id = id;
        createRelGenOps.push(op);
      } else if (change.next === null) {
        deleteRelGenOps.push(deleteEntity(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as SemanticModelGeneralization;
        modifyOps.push(modifyGeneralization(id, rest));
      }
    } else {
      remainingChanges.push(change);
    }
  }

  return {
    operations: [
      ...createClassOps,
      ...createRelGenOps,
      ...modifyOps,
      ...deleteRelGenOps,
      ...deleteClassOps
    ],
    remainingChanges,
  };
}
