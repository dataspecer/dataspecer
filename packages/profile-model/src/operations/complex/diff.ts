import { createGeneralization, deleteEntity, modifyGeneralization } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import type { EntityChange } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { isProfileClass, isProfileGeneralization, isProfileRelationship, type ProfileClass, type ProfileGeneralization, type ProfileRelationship } from "../../index.ts";

export interface ProfileModelOperationsResult {
  operations: Operation[];
  remainingChanges: EntityChange[];
}

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * Converts entity changes into profile model operations, filtering out changes
 * not relevant to the profile model (class profiles, relationship profiles,
 * generalizations). Remaining changes are returned so another layer can handle
 * them.
 *
 * Operations are ordered to avoid acting on non-existing entities: create
 * classes → create relationships/generalizations → modify all → delete
 * relationships/generalizations → delete classes.
 */
export function changesToProfileModelOperations(changes: EntityChange[]): ProfileModelOperationsResult {
  const remainingChanges: EntityChange[] = [];

  const createClassOps: Operation[] = [];
  const createRelGenOps: Operation[] = [];
  const modifyOps: Operation[] = [];
  const deleteRelGenOps: Operation[] = [];
  const deleteClassOps: Operation[] = [];

  for (const change of changes) {
    const entity = change.next ?? change.previous;

    if (isProfileClass(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as ProfileClass;
        createClassOps.push(factory.createClassProfile(rest));
      } else if (change.next === null) {
        deleteClassOps.push(deleteEntity(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as ProfileClass;
        modifyOps.push(factory.modifyClassProfile(id, rest));
      }
    } else if (isProfileRelationship(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as ProfileRelationship;
        createRelGenOps.push(factory.createRelationshipProfile(rest));
      } else if (change.next === null) {
        deleteRelGenOps.push(deleteEntity(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as ProfileRelationship;
        modifyOps.push(factory.modifyRelationshipProfile(id, rest));
      }
    } else if (isProfileGeneralization(entity)) {
      if (change.previous === null) {
        const { type: _, id, ...rest } = change.next as ProfileGeneralization;
        const op = createGeneralization(rest);
        op.entity.id = id;
        createRelGenOps.push(op);
      } else if (change.next === null) {
        deleteRelGenOps.push(deleteEntity(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as ProfileGeneralization;
        modifyOps.push(modifyGeneralization(id, rest));
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
