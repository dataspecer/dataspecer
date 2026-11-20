import {
  isSemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualModel,
  Waypoint,
} from "@dataspecer/visual-model";

import { EntityDsIdentifier, ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  createWaypointsForSelfLoop,
} from "../../../dataspecer/visual-model/operation/add-visual-relationships";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import {
  findWritableVisualModel,
  getEntity,
  getVisualEntity,
  isVisualEdgeEnd,
  VisualEdgeEndPoint,
} from "./visual-model-utilities";
import { isSemanticConnection } from "./visual-model-additions";

/**
 * Show given entity as a single visual edge between the given visual ends.
 *
 * Use this when the ends are chosen by the user, for example when
 * the user draws a connection between two nodes.
 * To connect all visual representations of the ends use
 * showRelationship, showGeneralization or updateVisualNodeProfiles.
 *
 * The caller is responsible for the ends to represent the entity ends.
 */
interface ShowVisualEdgeArguments extends CmeOperationArguments {

  type: typeof ShowVisualEdgeType;

  visualModel: ModelDsIdentifier;

  /**
   * Relationship, relationship profile, generalization or class profile.
   * For a class profile a visual profile relationship is created.
   */
  entity: EntityDsIdentifier;

  /**
   * Visual node or visual diagram node.
   * For a class profile it is the node of the profile.
   */
  visualSource: string;

  /**
   * Visual node or visual diagram node.
   * For a class profile it is the node of the profiled entity.
   */
  visualTarget: string;

}

const ShowVisualEdgeType =
  "show-visual-edge-operation";

interface ShowVisualEdgeResult
  extends CmeOperationResult<ShowVisualEdgeArguments> {

  /**
   * Identifier of the visual edge, existing or created.
   */
  visualEdge: string;

  /**
   * False when the edge already existed.
   */
  created: boolean;

}

export const showVisualEdgeOperation: CmeOperation<
  ShowVisualEdgeArguments, ShowVisualEdgeResult> = {
  metadata: {
    type: ShowVisualEdgeType,
  },
  create: (_context, parameters) => ({
    type: ShowVisualEdgeType,
    ...parameters,
  }),
  execute: showVisualEdgeExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function showVisualEdgeExecutor(
  context: CmeExecutionContext,
  args: ShowVisualEdgeArguments,
): Promise<ShowVisualEdgeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const { entity, model } = getEntity(context, args.entity);
  const source = getVisualEdgeEnd(visualModel, args.visualSource);
  const target = getVisualEdgeEnd(visualModel, args.visualTarget);

  const existing = visualModel.getVisualEntitiesForRepresented(entity.id)
    .filter(item => isVisualRelationship(item) || isVisualProfileRelationship(item))
    .find(item => item.visualSource === source.id
      && item.visualTarget === target.id);
  if (existing !== undefined) {
    return { args, visualEdge: existing.id, created: false };
  }

  if (isSemanticModelClassProfile(entity)) {
    const visualEdge = visualModel.addVisualProfileRelationship({
      entity: entity.id,
      model,
      visualSource: source.id,
      visualTarget: target.id,
      waypoints: [],
    });
    return { args, visualEdge, created: true };
  }

  if (isSemanticConnection(entity)) {
    const waypoints: Waypoint[] = [];
    if (source.id === target.id && isVisualNode(source)) {
      waypoints.push(...createWaypointsForSelfLoop(source.position));
    }
    const visualEdge = visualModel.addVisualRelationship({
      model,
      representedRelationship: entity.id,
      visualSource: source.id,
      visualTarget: target.id,
      waypoints,
    });
    return { args, visualEdge, created: true };
  }

  throw new InvalidEntity(
    "Expected a relationship, relationship profile, generalization or class profile.");
}

/**
 * @throws MissingEntity
 * @throws InvalidEntity
 */
function getVisualEdgeEnd(
  visualModel: VisualModel,
  identifier: string,
): VisualEdgeEndPoint {
  const result = getVisualEntity(visualModel, identifier);
  if (!isVisualEdgeEnd(result)) {
    throw new InvalidEntity("Expected a visual node or a visual diagram node.");
  }
  return result;
}
