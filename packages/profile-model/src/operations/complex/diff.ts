import { createGeneralization, deleteEntity, modifyGeneralization } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import { createPatch, type EntityChange } from "@dataspecer/core/entity-model";
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
        const patch = createPatch(change.previous as ProfileClass, change.next as ProfileClass, true);
        const { type: _, id: __, ...rest } = patch as Partial<ProfileClass>;
        if (Object.keys(rest).length > 0) {
          modifyOps.push(factory.modifyClassProfile(change.next.id, rest));
        }
      }
    } else if (isProfileRelationship(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as ProfileRelationship;
        createRelGenOps.push(factory.createRelationshipProfile(rest));
      } else if (change.next === null) {
        deleteRelGenOps.push(deleteEntity(change.previous.id));
      } else {
        const previous = change.previous as ProfileRelationship;
        const next = change.next as ProfileRelationship;

        const patch = createPatch(previous, next, true);
        const { type: _, id: __, ends: ___, ...rest } = patch as Partial<ProfileRelationship>;
        if (Object.keys(rest).length > 0) {
          modifyOps.push(factory.modifyRelationshipProfile(change.next.id, rest));
        }
        // We suppose that each relationship has two ends
        for (const index of [0, 1]) {
          const nextEnd = next.ends[index];
          const prevEnd = previous.ends[index];
          const patch = createPatch(prevEnd, nextEnd, true);
          if (Object.keys(patch).length > 0) {
            modifyOps.push(factory.modifyRelationshipEndProfile(change.next.id, index, patch));
          }
        }
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
        const patch = createPatch(change.previous as ProfileGeneralization, change.next as ProfileGeneralization, true);
        const { type: _, id: __, ...rest } = patch as Partial<ProfileGeneralization>;
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
