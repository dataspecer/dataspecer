import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findVisualModel } from "../operation-utilities";

export function showSemanticClassOperation(
  args: Omit<ShowSemanticClassArguments, "type">,
): ShowSemanticClassArguments {
  return {
    type: ShowSemanticClassType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  ShowSemanticClassType,
  { execute: showSemanticClassExecutor });

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

