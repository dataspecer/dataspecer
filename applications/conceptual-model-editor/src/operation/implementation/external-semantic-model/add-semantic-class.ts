import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";

import { isExternalSemanticModel } from "../../../dataspecer/semantic-model";
import { findSemanticModel } from "../operation-utilities";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  ModelIsNotWritable,
} from "../../operation";

/**
 * Add a single class from the external source to the external semantic model.
 * Unlike addSemanticClassSurroundings it does not add
 * the class surroundings.
 *
 * To remove the class use deleteSemanticEntities.
 */
interface AddSemanticClassArguments extends CmeOperationArguments {

  type: typeof AddSemanticClassType;

  semanticModel: ModelDsIdentifier;

  /**
   * Identifier (IRI) of the class in the external source.
   */
  entity: EntityDsIdentifier;

}

const AddSemanticClassType =
  "add-semantic-class-operation";

type AddSemanticClassResult =
  CmeOperationResult<AddSemanticClassArguments>;

export const addSemanticClassOperation: CmeOperation<
  AddSemanticClassArguments, AddSemanticClassResult> = {
  metadata: {
    type: AddSemanticClassType,
  },
  create: (_context, parameters) => ({
    type: AddSemanticClassType,
    ...parameters,
  }),
  execute: addSemanticClassExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function addSemanticClassExecutor(
  context: CmeExecutionContext,
  args: AddSemanticClassArguments,
): Promise<AddSemanticClassResult> {
  const model = findSemanticModel(context, args.semanticModel);
  if (!isExternalSemanticModel(model)) {
    throw new ModelIsNotWritable();
  }
  await model.allowClass(args.entity);
  return { args };
}
