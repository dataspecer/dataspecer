import {
  isVisualNode,
  isVisualRelationship,
  type Position,
  type VisualEntity,
  type Waypoint,
  type WritableVisualModel,
} from "@dataspecer/visual-model";
import { DataspecerError } from "../../dataspecer-error";
import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";

/**
 * Adds given semantic relationship identified by {@link represented} to visual model.
 * Uses the specified {@link visualSources} or {@link visualTargets} as the ends
 * for the created visual relationship.
 * If any of the given ends is empty then throw error.
 * @throws DataspecerError
 */
export function addVisualRelationshipsWithSpecifiedVisualEnds(
  visualModel: WritableVisualModel,
  model: ModelDsIdentifier,
  represented: EntityDsIdentifier,
  visualSources: VisualEntity[],
  visualTargets: VisualEntity[],
) {
  if (visualSources.length === 0 || visualTargets.length === 0) {
    throw new DataspecerError("Source or target are not in the visual model.");
  }

  const existingVisualRelationships = visualModel.getVisualEntitiesForRepresented(represented)
    .filter(isVisualRelationship);

  for (const visualSource of visualSources) {
    for (const visualTarget of visualTargets) {
      const alreadyExists = existingVisualRelationships
        .find(visualRelationship =>
          visualRelationship.visualSource === visualSource.identifier &&
          visualRelationship.visualTarget === visualTarget.identifier) !== undefined;
      if (alreadyExists) {
        continue;
      }

      const waypoints: Waypoint[] = [];
      if (visualSource === visualTarget && isVisualNode(visualSource)) {
        const position = visualSource.position;
        waypoints.push(...createWaypointsForSelfLoop(position));
      }
      visualModel.addVisualRelationship({
        model,
        representedRelationship: represented,
        waypoints,
        visualSource: visualSource.identifier,
        visualTarget: visualTarget.identifier,
      });
    }
  }
}

export function createWaypointsForSelfLoop(
  position: Position
) {
  const loop = [
    {
      x: position.x - 120,
      y: position.y + 10,
      anchored: position.anchored,
    }, {
      x: position.x - 120,
      y: position.y + 50,
      anchored: position.anchored,
    },
  ];
  return loop;
}

/**
 * @throws DataspecerError
 */
export function addVisualRelationshipsForRepresented(
  visualModel: WritableVisualModel,
  model: ModelDsIdentifier,
  represented: EntityDsIdentifier,
  source: EntityDsIdentifier,
  target: EntityDsIdentifier,
) {
  const visualSources = visualModel.getVisualEntitiesForRepresented(source);
  const visualTargets = visualModel.getVisualEntitiesForRepresented(target);
  addVisualRelationshipsWithSpecifiedVisualEnds(
    visualModel, model, represented, visualSources, visualTargets);
}
