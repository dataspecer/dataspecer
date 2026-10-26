import { XY } from "@dataspecer/layout";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findWritableVisualModel } from "./visual-model-utilities";
import { getVisualEdge } from "./visual-edge-utilities";

export function moveWaypointsOperation(
  args: Omit<MoveWaypointsArguments, "type">,
): CmeOperation<MoveWaypointsArguments, MoveWaypointsResult> {
  return {
    type: MoveWaypointsType,
    ...args,
  };
}

const MoveWaypointsType =
  "move-waypoints-operation";

interface MoveWaypointsArguments extends CmeOperationArguments {

  type: typeof MoveWaypointsType;

  visualModel: ModelDsIdentifier;

  /**
   * New positions keyed by visual edge identifier and waypoint index.
   */
  positions: Record<string, Record<number, XY>>;

}

type MoveWaypointsResult =
  CmeOperationResult<MoveWaypointsArguments>;

cmeOperationExecutorRegistry.register(
  MoveWaypointsType,
  moveWaypointsOperation,
  { execute: moveWaypointsExecutor });

/**
 * All edges are validated before any is changed.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function moveWaypointsExecutor(
  context: CmeExecutionContext,
  args: MoveWaypointsArguments,
): Promise<MoveWaypointsResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const changes = Object.entries(args.positions).map(([identifier, positions]) =>
    ({ edge: getVisualEdge(visualModel, identifier), positions }));
  for (const { edge, positions } of changes) {
    const waypoints = [...edge.waypoints];
    for (const [index, position] of Object.entries(positions)) {
      const waypointIndex = Number(index);
      waypoints[waypointIndex] = {
        ...waypoints[waypointIndex],
        x: position.x,
        y: position.y,
      };
    }
    visualModel.updateVisualEntity(edge.id, { waypoints });
  }
  return { args };
}
