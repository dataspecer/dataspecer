import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import { isInMemorySemanticModel } from "../../../dataspecer/semantic-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  ModelIsNotWritable,
} from "../../operation";
import { findSemanticModel } from "../operation-utilities";

const UpdateSemanticModelType =
  "update-semantic-model-operation";

interface UpdateSemanticModelArguments extends CmeOperationArguments {

  type: typeof UpdateSemanticModelType;

  semanticModel: ModelDsIdentifier;

  alias: string | null;

  baseIri: string | null;

}

type UpdateSemanticModelResult =
  CmeOperationResult<UpdateSemanticModelArguments>;

export const updateSemanticModelOperation: CmeOperation<
  UpdateSemanticModelArguments, UpdateSemanticModelResult> = {
  metadata: {
    type: UpdateSemanticModelType,
  },
  create: (_context, parameters) => ({
    type: UpdateSemanticModelType,
    ...parameters,
  }),
  execute: updateSemanticModelExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function updateSemanticModelExecutor(
  context: CmeExecutionContext,
  args: UpdateSemanticModelArguments,
): Promise<UpdateSemanticModelResult> {
  const model = findSemanticModel(context, args.semanticModel);
  if (!isInMemorySemanticModel(model)) {
    throw new ModelIsNotWritable();
  }
  model.setAlias(args.alias);
  model.setBaseIri(args.baseIri ?? "");
  return { args };
}
