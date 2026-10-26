import { WritableVisualModel } from "@dataspecer/visual-model";
import { XY } from "@dataspecer/layout";

import { createLogger } from "../../../application";
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
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  EntityWithModel,
  findEntity,
  findWritableVisualModel,
  getAllEntities,
  NodeDimensions,
} from "./visual-model-utilities";
import {
  addRelatedEntities,
  addVisualConnection,
  addVisualNodeForEntity,
  findPositionsForNewNodes,
  isClassOrClassProfile,
  isSemanticConnection,
} from "./visual-model-additions";

const LOG = createLogger(import.meta.url);

export function showEntitiesOperation(
  args: Omit<ShowEntitiesArguments, "type">,
): CmeOperation<ShowEntitiesArguments, ShowEntitiesResult> {
  return {
    type: ShowEntitiesType,
    ...args,
  };
}

const ShowEntitiesType =
  "show-entities-operation";

export interface EntityToShow {

  identifier: EntityDsIdentifier;

  /**
   * Position for classes and class profiles,
   * when null the position is computed using layout.
   */
  position: XY | null;

}

interface ShowEntitiesArguments extends CmeOperationArguments {

  type: typeof ShowEntitiesType;

  visualModel: ModelDsIdentifier;

  entities: EntityToShow[];

  /**
   * Used for a node with no visible neighbors, usually the viewport center.
   */
  fallbackPosition: XY;

  /**
   * Dimensions of nodes rendered in the diagram.
   * Used for layout, missing values are estimated.
   */
  nodeDimensions?: NodeDimensions;

}

interface ShowEntitiesResult
  extends CmeOperationResult<ShowEntitiesArguments> {

  /**
   * Entities already in the visual model, missing,
   * or with not supported type are skipped.
   */
  skipped: EntityDsIdentifier[];

}

cmeOperationExecutorRegistry.register(
  ShowEntitiesType,
  showEntitiesOperation,
  { execute: showEntitiesExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function showEntitiesExecutor(
  context: CmeExecutionContext,
  args: ShowEntitiesArguments,
): Promise<ShowEntitiesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const skipped = await showEntities(
    context, visualModel, args.entities,
    args.fallbackPosition, args.nodeDimensions);
  return { args, skipped };
}

/**
 * Nodes are added first, so edges can connect to them.
 *
 * @returns Skipped entities.
 */
export async function showEntities(
  context: CmeExecutionContext,
  visualModel: WritableVisualModel,
  entitiesToShow: EntityToShow[],
  fallbackPosition: XY,
  nodeDimensions: NodeDimensions | undefined,
): Promise<EntityDsIdentifier[]> {
  const skipped: EntityDsIdentifier[] = [];
  const nodes: { entity: EntityWithModel, position: XY | null }[] = [];
  const edges: EntityWithModel[] = [];
  for (const { identifier, position } of entitiesToShow) {
    if (visualModel.hasVisualEntityForRepresented(identifier)) {
      skipped.push(identifier);
      continue;
    }
    const entity = findEntity(context, identifier);
    if (entity === null) {
      LOG.warn("Missing entity.", { identifier });
      skipped.push(identifier);
      continue;
    }
    if (isClassOrClassProfile(entity.entity)) {
      nodes.push({ entity, position });
    } else if (isSemanticConnection(entity.entity)) {
      edges.push(entity);
    } else {
      LOG.warn("Entity of not supported type.", { entity });
      skipped.push(identifier);
    }
  }

  // Compute missing positions.
  const positions = await findPositionsForNewNodes(
    context, visualModel,
    nodes.filter(item => item.position === null)
      .map(item => item.entity.entity.id),
    fallbackPosition, nodeDimensions);

  // Add nodes.
  const entities = getAllEntities(context);
  const rawEntities = entities.map(item => item.entity);
  for (const { entity, position } of nodes) {
    addVisualNodeForEntity(
      rawEntities, visualModel, entity.entity.id, entity.model,
      position ?? positions[entity.entity.id] ?? fallbackPosition, null);
    addRelatedEntities(entities, visualModel, entity);
  }

  // Add edges.
  for (const { entity, model } of edges) {
    if (!isSemanticConnection(entity)) {
      continue;
    }
    if (!addVisualConnection(visualModel, entity, model)) {
      skipped.push(entity.id);
    }
  }

  return skipped;
}
