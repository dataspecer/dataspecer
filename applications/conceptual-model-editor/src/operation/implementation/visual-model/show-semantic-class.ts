import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { findVisualModel } from "../operation-utilities";

const ShowSemanticClassType =
  "show-semantic-class-operation";

interface ShowSemanticClassArguments extends CmeOperationArguments {

  type: typeof ShowSemanticClassType;

  visualModel: ModelDsIdentifier;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  x: number;

  y: number;

}

type ShowSemanticClassResult =
  CmeOperationResult<ShowSemanticClassArguments>;

export const showSemanticClassOperation: CmeOperation<
  ShowSemanticClassArguments, ShowSemanticClassResult> = {
  metadata: {
    type: ShowSemanticClassType,
  },
  create: (_context, parameters) => ({
    type: ShowSemanticClassType,
    ...parameters,
  }),
  execute: showSemanticClassExecutor,
};

async function showSemanticClassExecutor(
  context: CmeExecutionContext,
  args: ShowSemanticClassArguments,
): Promise<ShowSemanticClassResult> {
  const model = findVisualModel(context, args.visualModel);

  // TODO: Provided content here.
  //    getVisualNodeContentBasedOnExistingEntities
  const content: string[] = [];

  //
  model.addVisualNode({
    model: args.semanticModel,
    representedEntity: args.entity,
    position: {
      x: args.x,
      y: args.y,
      anchored: null,
    },
    content,
    visualModels: [],
  });
  return { args };
}

