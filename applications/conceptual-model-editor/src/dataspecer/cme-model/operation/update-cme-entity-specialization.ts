import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  CreatedEntityOperationResult,
  createGeneralization,
  deleteEntity,
} from "@dataspecer/core-v2/semantic-model/operations";
import {
  CmeGeneralization,
  CmeReference,
  CmeSpecialization,
  isCmeReferenceEqual,
  isCmeSpecialization,
  NewCmeSpecialization,
} from "../model";
import { createLogger } from "../../../application";
import type { Operation } from "@dataspecer/core/operation";

const LOG = createLogger(import.meta.url);

/**
 * This operation works with multiple models.
 *
 * @param writeModel Model to create new entities into.
 * @throws DataspecerError
 */
export function updateCmeSpecialization(
  models: InMemorySemanticModel[],
  writeModel: InMemorySemanticModel,
  entity: CmeReference,
  previous: (NewCmeSpecialization | CmeSpecialization)[],
  next: (NewCmeSpecialization | CmeSpecialization)[],
): {
  created: CmeGeneralization[],
  removed: CmeReference[],
} {
  const operations: Operation[] = [];
  const nextGeneralizations: CmeReference[] = [];
  const created: CmeGeneralization[] = [];
  // Create new.
  for (const item of next) {
    if (isCmeSpecialization(item)) {
      // This is already existing specialization, we store it for later.
      nextGeneralizations.push(item.generalization);
      continue;
    }
    // Create a new generalization.
    operations.push(createGeneralization({
      iri: item.iri,
      parent: item.specializationOf.identifier,
      child: entity.identifier,
    }));
    // Prepare result.
    created.push({
      identifier: "",
      model: writeModel.getId(),
      iri: item.iri,
      parentIdentifier: item.specializationOf.identifier,
      childIdentifier: entity.identifier,
    });
  }
  const result = writeModel.executeOperations(operations);
  result.forEach((item, index) => {
    const createResult = item as CreatedEntityOperationResult;
    created[index].identifier = createResult.id;
  });
  // Remove old that are not part of next.
  const removed: CmeReference[] = [];
  for (const item of previous) {
    if (!isCmeSpecialization(item)) {
      // Not sure how this happened, we just ignore it.
      continue;
    }
    // Search if it is is missing in next.
    const matching = nextGeneralizations.find(
      existing => isCmeReferenceEqual(existing, item.generalization));
    if (matching !== undefined) {
      // There is matching in next so we do not remove.
      continue;
    }
    // We need to remove it from the respective model.
    const model = models.find(
      model => model.getId() === item.generalization.model);
    if (model === undefined) {
      LOG.error("Can not find model to delete a specialization.",
        { specialization: item });
      continue;
    }
    model.executeOperation(deleteEntity(item.generalization.identifier));
    removed.push({
      model: model.getId(),
      identifier: item.generalization.identifier,
    });
  }
  return { created, removed };
}
