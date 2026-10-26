import { isVisualNode, VisualNode } from "@dataspecer/visual-model";
import {
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import { getDomainAndRangeConcepts } from "../../../util/relationship-utils";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getEntity,
  getVisualNode,
} from "./visual-model-utilities";

export function showAttributeOperation(
  args: Omit<ShowAttributeArguments, "type">,
): CmeOperation<ShowAttributeArguments, ShowAttributeResult> {
  return {
    type: ShowAttributeType,
    ...args,
  };
}

const ShowAttributeType =
  "show-attribute-operation";

interface ShowAttributeArguments extends CmeOperationArguments {

  type: typeof ShowAttributeType;

  visualModel: ModelDsIdentifier;

  /**
   * Attribute or attribute profile.
   */
  attribute: EntityDsIdentifier;

  /**
   * When set only this visual node is updated,
   * otherwise all visual nodes of the attribute's domain are updated.
   */
  visualNode: string | null;

  /**
   * Position in the node content, null to put the attribute at the end.
   */
  position: number | null;

}

interface ShowAttributeResult
  extends CmeOperationResult<ShowAttributeArguments> {

  /**
   * Visual nodes the attribute was added to.
   * Nodes which already contain the attribute are not included.
   */
  updated: string[];

}

cmeOperationExecutorRegistry.register(
  ShowAttributeType,
  showAttributeOperation,
  { execute: showAttributeExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function showAttributeExecutor(
  context: CmeExecutionContext,
  args: ShowAttributeArguments,
): Promise<ShowAttributeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);

  let nodes: VisualNode[];
  if (args.visualNode !== null) {
    nodes = [getVisualNode(visualModel, args.visualNode)];
  } else {
    const { entity } = getEntity(context, args.attribute);
    if (!isSemanticModelRelationship(entity)
      && !isSemanticModelRelationshipProfile(entity)) {
      throw new InvalidEntity("Expected an attribute.");
    }
    const { domain } = getDomainAndRangeConcepts(entity);
    if (domain === null) {
      throw new InvalidEntity("Missing domain.");
    }
    nodes = visualModel.getVisualEntitiesForRepresented(domain)
      .filter(isVisualNode);
  }

  const updated: string[] = [];
  for (const node of nodes) {
    if (node.content.includes(args.attribute)) {
      continue;
    }
    const content = [...node.content];
    content.splice(args.position ?? content.length, 0, args.attribute);
    visualModel.updateVisualEntity(node.id, { content });
    updated.push(node.id);
  }
  return { args, updated };
}
