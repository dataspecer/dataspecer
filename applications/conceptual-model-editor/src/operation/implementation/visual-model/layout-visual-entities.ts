import {
  ExplicitAnchors,
  LayoutedVisualEntities,
  performLayout,
  UserGivenAlgorithmConfigurations,
} from "@dataspecer/layout";
import {
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
} from "@dataspecer/visual-model";

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
  getBoundingBoxInfo,
  getEntityModelsForLayout,
  NodeDimensions,
} from "./visual-model-utilities";
import { applyLayout } from "./layout-visual-model";

export function layoutVisualEntitiesOperation(
  args: Omit<LayoutVisualEntitiesArguments, "type">,
): LayoutVisualEntitiesArguments {
  return {
    type: LayoutVisualEntitiesType,
    ...args,
  };
}

const LayoutVisualEntitiesType =
  "layout-visual-entities-operation";

interface LayoutVisualEntitiesArguments extends CmeOperationArguments {

  type: typeof LayoutVisualEntitiesType;

  visualModel: ModelDsIdentifier;

  visualEntities: string[];

  configuration: UserGivenAlgorithmConfigurations;

  explicitAnchors?: ExplicitAnchors;

  nodeDimensions?: NodeDimensions;

}

interface LayoutVisualEntitiesResult
  extends CmeOperationResult<LayoutVisualEntitiesArguments> {

  layout: LayoutedVisualEntities;

}

cmeOperationExecutorRegistry.register(
  LayoutVisualEntitiesType,
  { execute: layoutVisualEntitiesExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function layoutVisualEntitiesExecutor(
  context: CmeExecutionContext,
  args: LayoutVisualEntitiesArguments,
): Promise<LayoutVisualEntitiesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const layout = await performLayout(
    visualModel,
    getEntityModelsForLayout(context),
    { visualEntities: args.visualEntities, outsiders: {} },
    args.configuration,
    createNodeDimensionQueryHandler(args.nodeDimensions),
    args.explicitAnchors);

  // Shift the result so the center of the bounding box stays the same.
  const previousNodes = args.visualEntities
    .map(identifier => visualModel.getVisualEntity(identifier))
    .filter(entity => entity !== null)
    .filter(isVisualNode);
  const layoutedNodes = Object.values(layout)
    .map(entity => entity.visualEntity)
    .filter(isVisualNode);
  const previous = getBoundingBoxInfo(previousNodes, args.nodeDimensions);
  const next = getBoundingBoxInfo(layoutedNodes, args.nodeDimensions);
  const shiftX = next.mid.x - previous.mid.x;
  const shiftY = next.mid.y - previous.mid.y;
  for (const { visualEntity } of Object.values(layout)) {
    if (isVisualNode(visualEntity)) {
      visualEntity.position.x -= shiftX;
      visualEntity.position.y -= shiftY;
    } else if (isVisualRelationship(visualEntity)
      || isVisualProfileRelationship(visualEntity)) {
      for (const waypoint of visualEntity.waypoints) {
        waypoint.x -= shiftX;
        waypoint.y -= shiftY;
      }
    }
  }

  applyLayout(visualModel, layout);
  return { args, layout };
}
