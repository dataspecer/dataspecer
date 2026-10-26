import {
  isVisualDiagramNode,
  isVisualRelationship,
  VisualRelationship,
} from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import { getSemanticConnectionEndConcepts } from "../../../util/relationship-utils";
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
  getAllEntities,
  getClassToVisualDiagramNodeMapping,
  getVisualEntitiesForRepresentedGlobal,
  getVisualEntity,
  getWritableVisualModels,
  isVisualEdgeEnd,
} from "./visual-model-utilities";
import { isSemanticConnection } from "./visual-model-additions";

export function showDiagramNodeRelationshipsOperation(
  args: Omit<ShowDiagramNodeRelationshipsArguments, "type">,
): CmeOperation<ShowDiagramNodeRelationshipsArguments, ShowDiagramNodeRelationshipsResult> {
  return {
    type: ShowDiagramNodeRelationshipsType,
    ...args,
  };
}

const ShowDiagramNodeRelationshipsType =
  "show-diagram-node-relationships-operation";

interface ShowDiagramNodeRelationshipsArguments extends CmeOperationArguments {

  type: typeof ShowDiagramNodeRelationshipsType;

  visualModel: ModelDsIdentifier;

  /**
   * Identifier of the visual diagram node.
   */
  visualDiagramNode: string;

}

type ShowDiagramNodeRelationshipsResult =
  CmeOperationResult<ShowDiagramNodeRelationshipsArguments>;

cmeOperationExecutorRegistry.register(
  ShowDiagramNodeRelationshipsType,
  showDiagramNodeRelationshipsOperation,
  { execute: showDiagramNodeRelationshipsExecutor });

/**
 * Visual profile relationships are not added,
 * they are handled by the visual model validation.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function showDiagramNodeRelationshipsExecutor(
  context: CmeExecutionContext,
  args: ShowDiagramNodeRelationshipsArguments,
): Promise<ShowDiagramNodeRelationshipsResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const diagramNode = getVisualEntity(visualModel, args.visualDiagramNode);
  if (!isVisualDiagramNode(diagramNode)) {
    throw new InvalidEntity("Expected a visual diagram node.");
  }
  const availableVisualModels = getWritableVisualModels(context);

  const mapping = getClassToVisualDiagramNodeMapping(
    availableVisualModels, visualModel);
  const getVisualsGlobal = getVisualEntitiesForRepresentedGlobal(
    availableVisualModels, visualModel);

  const classesInDiagramNode = Object.entries(mapping)
    .filter(([_, diagramNodes]) => diagramNodes.includes(diagramNode.id))
    .map(([identifier]) => identifier);

  const connections = getAllEntities(context)
    .filter(item => isSemanticConnection(item.entity));

  const toAdd: Omit<VisualRelationship, "id" | "type">[] = [];
  for (const cclass of classesInDiagramNode) {
    for (const { entity, model } of connections) {
      if (!isSemanticConnection(entity)) {
        continue;
      }
      const { source, target } = getSemanticConnectionEndConcepts(entity);
      // The diagram node is the end containing the class,
      // the other end are the visual entities for the other concept.
      const ends: [string | null, boolean][] = [];
      if (source === cclass) {
        ends.push([target, false]);
      }
      if (target === cclass) {
        ends.push([source, true]);
      }
      for (const [end, isEndSource] of ends) {
        if (end === null) {
          continue;
        }
        const otherEnd = isEndSource ? "visualTarget" : "visualSource";
        const thisEnd = isEndSource ? "visualSource" : "visualTarget";
        // Remove ends already covered by a relationship.
        const available = getVisualsGlobal(end);
        for (const existing of visualModel.getVisualEntitiesForRepresented(entity.id)) {
          if (!isVisualRelationship(existing)
            || existing[otherEnd] !== diagramNode.id) {
            continue;
          }
          const index = available.findIndex(item => item.id === existing[thisEnd]);
          if (index !== -1) {
            available.splice(index, 1);
          }
        }
        for (const visualEnd of available) {
          if (!isVisualEdgeEnd(visualEnd) || visualEnd.id === diagramNode.id) {
            // We do not create a self-loop for relationship inside the node.
            continue;
          }
          toAdd.push({
            representedRelationship: entity.id,
            model,
            waypoints: [],
            visualSource: isEndSource ? visualEnd.id : diagramNode.id,
            visualTarget: isEndSource ? diagramNode.id : visualEnd.id,
          });
        }
      }
    }
  }

  for (const item of toAdd) {
    visualModel.addVisualRelationship(item);
  }
  return { args };
}
