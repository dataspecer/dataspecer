
import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../dataspecer/entity-model";
import {
  CmeOperationArguments,
  CmeOperationResult,
} from "../operation";
import {
  CmeExecutionContext,
  register,
} from "../operation-registry";
import { findModel } from "../operation-utilities";
import { isWritableVisualModel } from "@dataspecer/core-v2/visual-model";

interface ShowSemanticClassArguments extends CmeOperationArguments {

  type: typeof ShowSemanticClassType;

  visualModel: ModelDsIdentifier;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  x: number;

  y: number;

}

const ShowSemanticClassType =
  "show-semantic-class-operation";

type ShowSemanticClassResult =
  CmeOperationResult<ShowSemanticClassArguments>;

export type ShowSemanticClassOperation = [
  ShowSemanticClassArguments, ShowSemanticClassResult];

async function showSemanticClassExecutor(
  context: CmeExecutionContext,
  args: ShowSemanticClassArguments,
): Promise<ShowSemanticClassResult> {
  const model = findModel(
    context.visualModels, isWritableVisualModel, args.visualModel);

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

register(
  ShowSemanticClassType,
  showSemanticClassExecutor,
  "Show semantic class",
  "Add semantic class to current visual model."
);
