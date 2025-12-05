import { WritableVisualModel } from "@dataspecer/visual-model";
import { placeCoordinateOnGrid, XY } from "@dataspecer/layout";
import { UseDiagramType } from "../diagram/diagram-hook";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { configuration } from "../application";
import {
  Coordinate,
  getBotRightPosition,
  getBoundingBoxInfo,
  getDimensionValue,
  getOtherCoordinate,
  getRelevantDimensionForCoordinate,
  getTopLeftPosition,
  isVisualEdgeEnd
} from "./utilities";

type AlignmentPosition = AlignmentHorizontalPosition | AlignmentVerticalPosition;
export enum AlignmentHorizontalPosition {
    Left,
    Mid,
    Right
}
export enum AlignmentVerticalPosition {
    Top,
    Mid,
    Bot
}

/**
 * General method used for vertical and horizontal alignment,
 * since they are almost the same, just with swapped coordinates
 */
function alignGeneral(
  notifications: UseNotificationServiceWriterType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  identifiers: string[],
  alignmentPosition: AlignmentPosition,
  coordinateToChange: Coordinate
) {
  const nodes = [...visualModel.getVisualEntities().values()]
    .filter(entity => identifiers.includes(entity.identifier))
    .filter(isVisualEdgeEnd);

  const coordinateToKeep = getOtherCoordinate(coordinateToChange);
  const dimensionForChangeCoordinate = getRelevantDimensionForCoordinate(coordinateToChange);
  const grid = coordinateToChange === "x" ? configuration().xSnapGrid : configuration().ySnapGrid;

  // Left === Top, Right === Bot ... we don't include it in the switch, since then compiler throws some warnings
  switch(alignmentPosition) {
  case AlignmentHorizontalPosition.Left: {
    const topLeft = getTopLeftPosition(nodes);
    nodes.forEach(node => {
      visualModel.updateVisualEntity(node.identifier, {
        position: {
          [coordinateToChange]: topLeft[coordinateToChange],
          [coordinateToKeep]: node.position[coordinateToKeep]
        } as XY
      });
    });
    break;
  }
  case AlignmentVerticalPosition.Mid: {
    const { mid } = getBoundingBoxInfo(diagram, nodes);
    nodes.forEach(node => {
      const changedDimensionValue = getDimensionValue(
        diagram, dimensionForChangeCoordinate, node.identifier);
      visualModel.updateVisualEntity(node.identifier, {
        position: {
          [coordinateToChange]: placeCoordinateOnGrid(mid[coordinateToChange] - changedDimensionValue / 2, grid),
          [coordinateToKeep]: node.position[coordinateToKeep]
        } as XY
      });
    });

    break;
  }
  case AlignmentHorizontalPosition.Right: {
    const botRight = getBotRightPosition(diagram, nodes);
    nodes.forEach(node => {
      const changedDimensionValue = getDimensionValue(
        diagram, dimensionForChangeCoordinate, node.identifier);
      visualModel.updateVisualEntity(node.identifier, {
        position: {
          [coordinateToChange]: placeCoordinateOnGrid(botRight[coordinateToChange] - changedDimensionValue, grid),
          [coordinateToKeep]: node.position[coordinateToKeep]
        } as XY
      });

    });

    break;
  }
  default:
    notifications.error("Invalid alignment position");
  }
};

/**
 * Updates visual model in such a way, that the nodes given in {@link identifiers} are aligned horizontally
 */
export function alignHorizontallyAction(
  notifications: UseNotificationServiceWriterType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  identifiers: string[],
  alignmentPosition: AlignmentHorizontalPosition
) {
  alignGeneral(notifications, diagram, visualModel, identifiers, alignmentPosition, "x");
};

/**
 * Updates visual model in such a way, that the nodes given in {@link identifiers} are aligned vertically.
 */
export function alignVerticallyAction(
  notifications: UseNotificationServiceWriterType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  identifiers: string[],
  alignmentPosition: AlignmentVerticalPosition
) {
  alignGeneral(notifications, diagram, visualModel, identifiers, alignmentPosition, "y");
};