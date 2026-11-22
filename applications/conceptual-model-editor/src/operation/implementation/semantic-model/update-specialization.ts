import {
  createGeneralization,
  deleteEntity,
} from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  DataspecerOperationFailed,
  ModelIsNotWritable,
} from "../../operation";
import { findSemanticModel } from "../operation-utilities";
import { isInMemorySemanticModel } from "../../../dataspecer/semantic-model";

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

  /**
   * Generalizations to create, prepared from {@link next}.
   */
  created: CreatedGeneralization[];

  /**
   * Generalizations to remove, the ones in {@link previous}
   * missing in {@link next}.
   */
  removed: GeneralizationReference[];

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
  generalization: GeneralizationReference | null;

}

interface GeneralizationReference {

  identifier: EntityDsIdentifier;

  model: ModelDsIdentifier;

}

interface CreatedGeneralization extends GeneralizationReference {

  iri: string | null;

  child: EntityDsIdentifier;

  parent: EntityDsIdentifier;

}

interface UpdateSpecializationResult
  extends CmeOperationResult<UpdateSpecializationArguments> {

  created: CreatedGeneralization[];

  removed: GeneralizationReference[];

}

/**
 * The created and removed generalizations are prepared in create,
 * so operations in the same batch can use them.
 */
export const updateSpecializationOperation: CmeOperation<
  UpdateSpecializationArguments, UpdateSpecializationResult,
  Omit<UpdateSpecializationArguments, "type" | "created" | "removed">> = {
  metadata: {
    type: UpdateSpecializationType,
  },
  create: (context, parameters) => ({
    type: UpdateSpecializationType,
    ...parameters,
    created: parameters.next
      .filter(item => item.generalization === null)
      .map(item => ({
        identifier: context.createEntityIdentifier(parameters.model),
        model: parameters.model,
        iri: item.iri,
        child: parameters.entity,
        parent: item.specializationOf,
      })),
    removed: selectRemoved(parameters.previous, parameters.next),
  }),
  execute: updateSpecializationExecutor,
};

function selectRemoved(
  previous: Specialization[],
  next: Specialization[],
): GeneralizationReference[] {
  const kept = new Set(next
    .map(item => item.generalization)
    .filter(item => item !== null)
    .map(item => item.model + " " + item.identifier));
  return previous
    .map(item => item.generalization)
    .filter(item => item !== null)
    .filter(item => !kept.has(item.model + " " + item.identifier))
    .map(item => ({ identifier: item.identifier, model: item.model }));
}

/**
 * @throws CmeOperationExecutionFailed
 */
async function updateSpecializationExecutor(
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
  const results = writeModel.executeOperations(args.created.map(
    item => createGeneralization({
      id: item.identifier,
      iri: item.iri,
      parent: item.parent,
      child: item.child,
    })));
  if (results.some(item => item.success === false)) {
    throw new DataspecerOperationFailed();
  }

  // Remove previous that are not part of next.
  for (const generalization of args.removed) {
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
  }

  return { args, created: args.created, removed: args.removed };
}
