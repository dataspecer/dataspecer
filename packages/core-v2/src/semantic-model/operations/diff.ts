import { createPatch, type Entity, type EntityChange } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import type { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship, SemanticModelRelationshipEnd } from "../concepts/index.ts";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "../concepts/index.ts";
import { createClass, createGeneralization, createRelationship, deleteEntity, modifyClass, modifyGeneralization, modifyRelation, modifyRelationEnd } from "./operations.ts";

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
        const patch = createPatch(change.previous as SemanticModelClass, change.next as SemanticModelClass);
        const { type: _, id: __, ...rest } = patch as Partial<SemanticModelClass>;
        if (Object.keys(rest).length > 0) {
          modifyOps.push(modifyClass(change.next.id, rest));
        }
      }
    } else if (isSemanticModelRelationship(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as SemanticModelRelationship;
        createRelGenOps.push(createRelationship(rest));
      } else if (change.next === null) {
        deleteRelGenOps.push(deleteEntity(change.previous.id));
      } else {
        const previousRelationship = change.previous as SemanticModelRelationship;
        const nextRelationship = change.next as SemanticModelRelationship;
        const patch = createPatch(previousRelationship, nextRelationship) as Partial<SemanticModelRelationship>;
        const { type: _, id: __, ends, ...rest } = patch;

        if (Object.keys(rest).length > 0) {
          modifyOps.push(modifyRelation(nextRelationship.id, rest));
        }

        if (ends !== undefined) {
          const sameEndCount = previousRelationship.ends.length === nextRelationship.ends.length;

          if (sameEndCount) {
            for (let endIndex = 0; endIndex < nextRelationship.ends.length; endIndex++) {
              const previousEnd = previousRelationship.ends[endIndex];
              const nextEnd = nextRelationship.ends[endIndex];

              if (previousEnd === undefined || nextEnd === undefined) {
                continue;
              }

              const endPatch = createPatch(previousEnd as unknown as Entity, nextEnd as unknown as Entity) as Partial<SemanticModelRelationshipEnd>;
              if (Object.keys(endPatch).length > 0) {
                modifyOps.push(modifyRelationEnd(nextRelationship.id, endIndex, endPatch));
              }
            }
          } else {
            modifyOps.push(modifyRelation(nextRelationship.id, { ends: nextRelationship.ends }));
          }
        }
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
        const patch = createPatch(change.previous as SemanticModelGeneralization, change.next as SemanticModelGeneralization);
        const { type: _, id: __, ...rest } = patch as Partial<SemanticModelGeneralization>;
        if (Object.keys(rest).length > 0) {
          modifyOps.push(modifyGeneralization(change.next.id, rest));
        }
      }
    } else {
      remainingChanges.push(change);
    }
  }

  return {
    operations: [...createClassOps, ...createRelGenOps, ...modifyOps, ...deleteRelGenOps, ...deleteClassOps],
    remainingChanges,
  };
}
