import {
  isVisualNode,
  isVisualProfileRelationship,
} from "@dataspecer/visual-model";

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
import { findWritableVisualModel } from "./visual-model-utilities";
import { addVisualProfileRelationships } from "./visual-model-additions";

export function updateVisualNodeProfilesOperation(
  args: Omit<UpdateVisualNodeProfilesArguments, "type">,
): UpdateVisualNodeProfilesArguments {
  return {
    type: UpdateVisualNodeProfilesType,
    ...args,
  };
}

const UpdateVisualNodeProfilesType =
  "update-visual-node-profiles-operation";

interface UpdateVisualNodeProfilesArguments extends CmeOperationArguments {

  type: typeof UpdateVisualNodeProfilesType;

  visualModel: ModelDsIdentifier;

  /**
   * The class profile.
   */
  entity: EntityDsIdentifier;

  /**
   * Model of the class profile.
   */
  model: ModelDsIdentifier;

  /**
   * Profiled entities before the change.
   */
  previous: EntityDsIdentifier[];

  /**
   * Profiled entities after the change.
   */
  next: EntityDsIdentifier[];

}

type UpdateVisualNodeProfilesResult =
  CmeOperationResult<UpdateVisualNodeProfilesArguments>;

cmeOperationExecutorRegistry.register(
  UpdateVisualNodeProfilesType,
  { execute: updateVisualNodeProfilesExecutor });

/**
 * Adds profile edges for new profiled entities, removes edges of removed ones.
 * Nothing happens when the class profile is not in the visual model.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function updateVisualNodeProfilesExecutor(
  context: CmeExecutionContext,
  args: UpdateVisualNodeProfilesArguments,
): Promise<UpdateVisualNodeProfilesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const sources = visualModel.getVisualEntitiesForRepresented(args.entity);
  if (sources.length === 0) {
    return { args };
  }

  const create = args.next.filter(item => !args.previous.includes(item));
  const remove = new Set(args.previous.filter(item => !args.next.includes(item)));

  for (const profiled of create) {
    addVisualProfileRelationships(
      visualModel, args.entity, args.model, profiled);
  }

  if (remove.size > 0) {
    const sourceIdentifiers = new Set(sources.map(item => item.id));
    for (const visual of [...visualModel.getVisualEntities().values()]) {
      if (!isVisualProfileRelationship(visual)
        || visual.entity !== args.entity
        || !sourceIdentifiers.has(visual.visualSource)) {
        continue;
      }
      const target = visualModel.getVisualEntity(visual.visualTarget);
      if (target !== null && isVisualNode(target)
        && remove.has(target.representedEntity)) {
        visualModel.deleteVisualEntity(visual.id);
      }
    }
  }

  return { args };
}
