import {
  isVisualDiagramNode,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidOperationArguments,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  doesAddingVisualModelCauseSelfReference,
  findWritableVisualModel,
  getWritableVisualModels,
} from "./visual-model-utilities";

export function copyVisualEntitiesOperation(
  args: Omit<CopyVisualEntitiesArguments, "type">,
): CmeOperation<CopyVisualEntitiesArguments, CopyVisualEntitiesResult> {
  return {
    type: CopyVisualEntitiesType,
    ...args,
  };
}

const CopyVisualEntitiesType =
  "copy-visual-entities-operation";

interface CopyVisualEntitiesArguments extends CmeOperationArguments {

  type: typeof CopyVisualEntitiesType;

  sourceVisualModel: ModelDsIdentifier;

  /**
   * Existing visual model to copy to.
   */
  targetVisualModel: ModelDsIdentifier;

  /**
   * Visual nodes and visual diagram nodes.
   */
  visualNodes: string[];

  /**
   * Visual edges, only edges with both ends copied are copied.
   */
  visualEdges: string[];

}

interface CopyVisualEntitiesResult
  extends CmeOperationResult<CopyVisualEntitiesArguments> {

  /**
   * Maps identifiers in the source model to identifiers in the target model.
   */
  mapping: Record<string, string>;

}

cmeOperationExecutorRegistry.register(
  CopyVisualEntitiesType,
  copyVisualEntitiesOperation,
  { execute: copyVisualEntitiesExecutor });

/**
 * Use to fill a newly created visual model from a selection.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function copyVisualEntitiesExecutor(
  context: CmeExecutionContext,
  args: CopyVisualEntitiesArguments,
): Promise<CopyVisualEntitiesResult> {
  const source = findWritableVisualModel(context, args.sourceVisualModel);
  const target = findWritableVisualModel(context, args.targetVisualModel);
  // A copied diagram node must not reference the target model.
  const availableVisualModels = getWritableVisualModels(context);
  for (const identifier of args.visualNodes) {
    const node = source.getVisualEntity(identifier);
    if (node !== null && isVisualDiagramNode(node)
      && doesAddingVisualModelCauseSelfReference(
        availableVisualModels, target, node.representedVisualModel)) {
      throw new InvalidOperationArguments(
        "Copied visual diagram node would cause self reference.");
    }
  }
  const mapping = copyVisualEntities(
    source, target, args.visualNodes, args.visualEdges);
  return { args, mapping };
}

/**
 * @returns Mapping from source to target identifiers.
 */
export function copyVisualEntities(
  source: VisualModel,
  target: WritableVisualModel,
  visualNodes: string[],
  visualEdges: string[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const identifier of visualNodes) {
    const entity = source.getVisualEntity(identifier);
    if (entity === null) {
      continue;
    }
    if (isVisualNode(entity)) {
      mapping[entity.id] = target.addVisualNode({
        model: entity.model,
        representedEntity: entity.representedEntity,
        position: { ...entity.position },
        content: [...entity.content],
        visualModels: [...entity.visualModels],
        color: entity.color ?? null,
      });
    } else if (isVisualDiagramNode(entity)) {
      mapping[entity.id] = target.addVisualDiagramNode({
        position: { ...entity.position },
        representedVisualModel: entity.representedVisualModel,
      });
    }
  }
  for (const identifier of visualEdges) {
    const entity = source.getVisualEntity(identifier);
    if (entity === null) {
      continue;
    }
    if (!isVisualRelationship(entity) && !isVisualProfileRelationship(entity)) {
      continue;
    }
    const visualSource = mapping[entity.visualSource];
    const visualTarget = mapping[entity.visualTarget];
    if (visualSource === undefined || visualTarget === undefined) {
      continue;
    }
    const waypoints = entity.waypoints.map(item => ({ ...item }));
    if (isVisualRelationship(entity)) {
      mapping[entity.id] = target.addVisualRelationship({
        model: entity.model,
        representedRelationship: entity.representedRelationship,
        color: entity.color ?? null,
        waypoints,
        visualSource,
        visualTarget,
      });
    } else {
      mapping[entity.id] = target.addVisualProfileRelationship({
        model: entity.model,
        entity: entity.entity,
        color: entity.color ?? null,
        waypoints,
        visualSource,
        visualTarget,
      });
    }
  }
  return mapping;
}
