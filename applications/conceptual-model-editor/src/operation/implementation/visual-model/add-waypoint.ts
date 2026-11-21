import { Waypoint } from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { findWritableVisualModel } from "./visual-model-utilities";
import { getVisualEdge } from "./visual-edge-utilities";

const AddWaypointType =
  "add-waypoint-operation";

interface AddWaypointArguments extends CmeOperationArguments {

  type: typeof AddWaypointType;

  visualModel: ModelDsIdentifier;

  visualEdge: string;

  /**
   * Index to insert the waypoint at.
   */
  index: number;

  x: number;

  y: number;

}

type AddWaypointResult =
  CmeOperationResult<AddWaypointArguments>;

export const addWaypointOperation: CmeOperation<AddWaypointArguments, AddWaypointResult> = {
  metadata: {
    type: AddWaypointType,
  },
  create: (_context, parameters) => ({
    type: AddWaypointType,
    ...parameters,
  }),
  execute: addWaypointExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function addWaypointExecutor(
  context: CmeExecutionContext,
  args: AddWaypointArguments,
): Promise<AddWaypointResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const edge = getVisualEdge(visualModel, args.visualEdge);
  const waypoints: Waypoint[] = [
    ...edge.waypoints.slice(0, args.index),
    { x: args.x, y: args.y, anchored: null },
    ...edge.waypoints.slice(args.index),
  ];
  visualModel.updateVisualEntity(edge.id, { waypoints });
  return { args };
}
