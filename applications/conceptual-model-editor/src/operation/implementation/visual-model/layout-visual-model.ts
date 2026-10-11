import {
  ExplicitAnchors,
  LayoutedVisualEntities,
  performLayoutOfVisualModel,
  UserGivenAlgorithmConfigurations,
} from "@dataspecer/layout";
import { WritableVisualModel } from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  createNodeDimensionQueryHandler,
  findWritableVisualModel,
  getEntityModelsForLayout,
  NodeDimensions,
} from "./visual-model-utilities";

export function layoutVisualModelOperation(
  args: Omit<LayoutVisualModelArguments, "type">,
): LayoutVisualModelArguments {
  return {
    type: LayoutVisualModelType,
    ...args,
  };
}

const LayoutVisualModelType =
  "layout-visual-model-operation";

interface LayoutVisualModelArguments extends CmeOperationArguments {

  type: typeof LayoutVisualModelType;

  visualModel: ModelDsIdentifier;

  configuration: UserGivenAlgorithmConfigurations;

  /**
   * Overrides anchors stored in the visual model.
   */
  explicitAnchors?: ExplicitAnchors;

  /**
   * Dimensions of nodes rendered in the diagram,
   * missing values are estimated.
   */
  nodeDimensions?: NodeDimensions;

}

interface LayoutVisualModelResult
  extends CmeOperationResult<LayoutVisualModelArguments> {

  layout: LayoutedVisualEntities;

}

cmeOperationExecutorRegistry.register(
  LayoutVisualModelType,
  { execute: layoutVisualModelExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function layoutVisualModelExecutor(
  context: CmeExecutionContext,
  args: LayoutVisualModelArguments,
): Promise<LayoutVisualModelResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const layout = await performLayoutOfVisualModel(
    { visualModel, outsiders: {} },
    getEntityModelsForLayout(context),
    args.configuration,
    createNodeDimensionQueryHandler(args.nodeDimensions),
    args.explicitAnchors);
  applyLayout(visualModel, layout);
  return { args, layout };
}

/**
 * Update visual entities with the layout result, outsiders are ignored.
 */
export function applyLayout(
  visualModel: WritableVisualModel,
  layout: LayoutedVisualEntities,
): void {
  for (const { visualEntity, isOutsider } of Object.values(layout)) {
    if (isOutsider) {
      continue;
    }
    if (visualModel.getVisualEntity(visualEntity.id) === null) {
      continue;
    }
    visualModel.updateVisualEntity(visualEntity.id, visualEntity);
  }
}
