import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findWritableVisualModel } from "./visual-model-utilities";
import { getVisualEdge } from "./visual-edge-utilities";

export function deleteWaypointOperation(
  args: Omit<DeleteWaypointArguments, "type">,
): DeleteWaypointArguments {
  return {
    type: DeleteWaypointType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  DeleteWaypointType,
  { execute: deleteWaypointExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function deleteWaypointExecutor(
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
