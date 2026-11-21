import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { findWritableVisualModel } from "./visual-model-utilities";
import { getVisualEdge } from "./visual-edge-utilities";

const DeleteWaypointType =
  "delete-waypoint-operation";

interface DeleteWaypointArguments extends CmeOperationArguments {

  type: typeof DeleteWaypointType;

  visualModel: ModelDsIdentifier;

  visualEdge: string;

  index: number;

}

type DeleteWaypointResult =
  CmeOperationResult<DeleteWaypointArguments>;

export const deleteWaypointOperation: CmeOperation<
  DeleteWaypointArguments, DeleteWaypointResult> = {
  metadata: {
    type: DeleteWaypointType,
  },
  create: (_context, parameters) => ({
    type: DeleteWaypointType,
    ...parameters,
  }),
  execute: deleteWaypointExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function deleteWaypointExecutor(
  context: CmeExecutionContext,
  args: DeleteWaypointArguments,
): Promise<DeleteWaypointResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const edge = getVisualEdge(visualModel, args.visualEdge);
  const waypoints = [
    ...edge.waypoints.slice(0, args.index),
    ...edge.waypoints.slice(args.index + 1),
  ];
  visualModel.updateVisualEntity(edge.id, { waypoints });
  return { args };
}
