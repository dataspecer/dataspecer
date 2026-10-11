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
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findEntity,
  findWritableVisualModel,
  getVisualNode,
} from "./visual-model-utilities";

export function hideAttributesOperation(
  args: Omit<HideAttributesArguments, "type">,
): HideAttributesArguments {
  return {
    type: HideAttributesType,
    ...args,
  };
}

const HideAttributesType =
  "hide-attributes-operation";

interface HideAttributesArguments extends CmeOperationArguments {

  type: typeof HideAttributesType;

  visualModel: ModelDsIdentifier;

  /**
   * Attributes or attribute profiles.
   */
  attributes: EntityDsIdentifier[];

  /**
   * When set only this visual node is updated,
   * otherwise all visual nodes of the attributes' domains are updated.
   */
  visualNode: string | null;

}

type HideAttributesResult =
  CmeOperationResult<HideAttributesArguments>;

cmeOperationExecutorRegistry.register(
  HideAttributesType,
  { execute: hideAttributesExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function hideAttributesExecutor(
  context: CmeExecutionContext,
  args: HideAttributesArguments,
): Promise<HideAttributesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);

  const nodes = new Map<string, VisualNode>();
  if (args.visualNode !== null) {
    const node = getVisualNode(visualModel, args.visualNode);
    nodes.set(node.id, node);
  } else {
    for (const attribute of args.attributes) {
      const entity = findEntity(context, attribute)?.entity;
      if (entity === undefined || !(isSemanticModelRelationship(entity)
        || isSemanticModelRelationshipProfile(entity))) {
        continue;
      }
      const { domain } = getDomainAndRangeConcepts(entity);
      if (domain === null) {
        continue;
      }
      visualModel.getVisualEntitiesForRepresented(domain)
        .filter(isVisualNode)
        .forEach(node => nodes.set(node.id, node));
    }
  }

  for (const node of nodes.values()) {
    const content = node.content
      .filter(item => !args.attributes.includes(item));
    if (content.length !== node.content.length) {
      visualModel.updateVisualEntity(node.id, { content });
    }
  }
  return { args };
}
