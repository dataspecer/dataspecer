import {
  CreatedEntityOperationResult,
  createGeneralization,
  deleteEntity,
} from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  DataspecerOperationFailed,
  ModelIsNotWritable,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findSemanticModel } from "../operation-utilities";
import { isInMemorySemanticModel } from "../../../dataspecer/semantic-model";

export function updateSpecializationOperation(
  args: Omit<UpdateSpecializationArguments, "type">,
): UpdateSpecializationArguments {
  return {
    type: UpdateSpecializationType,
    ...args,
  };
}

interface UpdateSpecializationArguments extends CmeOperationArguments {

  type: typeof UpdateSpecializationType;

  /**
   * The specializing entity.
   */
  entity: EntityDsIdentifier;

  /**
   * Model to create new generalizations in.
   */
  model: ModelDsIdentifier;

  /**
   * Previous specializations.
   */
  previous: Specialization[];

  /**
   * Next specializations.
   */
  next: Specialization[];

}

const UpdateSpecializationType =
  "update-specialization-operation";

/**
 * Entity being specialized, with optional existing generalization.
 */
interface Specialization {

  iri: string | null;

  /**
   * Entity being specialized.
   */
  specializationOf: EntityDsIdentifier;

  /**
   * Existing generalization, null for a new specialization.
   */
  generalization: {
    identifier: EntityDsIdentifier,
    model: ModelDsIdentifier,
  } | null;

}

interface UpdateSpecializationResult
  extends CmeOperationResult<UpdateSpecializationArguments> {

  created: {
    identifier: EntityDsIdentifier,
    model: ModelDsIdentifier,
    iri: string | null,
    child: EntityDsIdentifier,
    parent: EntityDsIdentifier,
  }[];

  removed: {
    identifier: EntityDsIdentifier,
    model: ModelDsIdentifier,
  }[];

}

cmeOperationExecutorRegistry.register(
  UpdateSpecializationType,
  { execute: updateSpecializationExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function updateSpecializationExecutor(
  context: CmeExecutionContext,
  args: UpdateSpecializationArguments,
): Promise<UpdateSpecializationResult> {
  // TODO Here we abuse the facts,
  //  that semantic and profile models array are the same.
  const writeModel = findSemanticModel(context, args.model);
  if (!isInMemorySemanticModel(writeModel)) {
    throw new ModelIsNotWritable();
  }

  // Create new.
  const toCreate = args.next.filter(item => item.generalization === null);
  const operations = toCreate.map(item => createGeneralization({
    iri: item.iri,
    parent: item.specializationOf,
    child: args.entity,
  }));
  const results = writeModel.executeOperations(operations);
  const created = toCreate.map((item, index) => {
    const result = results[index] as CreatedEntityOperationResult;
    if (result?.success === false) {
      throw new DataspecerOperationFailed();
    }
    return {
      identifier: result.id,
      model: writeModel.getId(),
      iri: item.iri,
      child: args.entity,
      parent: item.specializationOf,
    };
  });

  // Remove previous that are not part of next.
  const kept = new Set(args.next
    .map(item => item.generalization)
    .filter(item => item !== null)
    .map(item => item.model + " " + item.identifier));
  const removed: UpdateSpecializationResult["removed"] = [];
  for (const { generalization } of args.previous) {
    if (generalization === null) {
      continue;
    }
    if (kept.has(generalization.model + " " + generalization.identifier)) {
      continue;
    }
    // TODO Here we abuse the facts,
    //  that semantic and profile models array are the same.
    const model = findSemanticModel(context, generalization.model);
    if (!isInMemorySemanticModel(model)) {
      throw new ModelIsNotWritable();
    }
    const result = model.executeOperation(
      deleteEntity(generalization.identifier));
    if (result.success === false) {
      throw new DataspecerOperationFailed();
    }
    removed.push({ ...generalization });
  }

  return { args, created, removed };
}
