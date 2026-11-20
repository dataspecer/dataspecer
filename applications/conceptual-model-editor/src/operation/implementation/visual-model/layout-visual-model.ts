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
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  createNodeDimensionQueryHandler,
  findWritableVisualModel,
  getEntityModelsForLayout,
  NodeDimensions,
} from "./visual-model-utilities";

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

export const layoutVisualModelOperation: CmeOperation<
  LayoutVisualModelArguments, LayoutVisualModelResult> = {
  metadata: {
    type: LayoutVisualModelType,
  },
  create: (_context, parameters) => ({
    type: LayoutVisualModelType,
    ...parameters,
  }),
  execute: layoutVisualModelExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function layoutVisualModelExecutor(
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
