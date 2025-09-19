import React, { useCallback, useContext } from "react";
import { useReactFlow } from "@xyflow/react";

import { type Point } from "./math";

import { type Edge as EdgeApi } from "../diagram-model";
import { DiagramContext, EdgeType } from "../diagram-controller";
import type { Waypoint as WaypointType } from "@dataspecer/visual-model";
import { replaceByIndexInArray } from "../../utilities/functional";

export function Waypoints(props: {
  edge: EdgeType,
  waypoints: Point[],
  data?: EdgeApi,
}) {
  return (
    <>
      {props.waypoints.slice(1, props.waypoints.length - 1).map((waypoint, index) => (
        <Waypoint key={`waypoint-${index}-${waypoint.x}-${waypoint.y}}`}
          edge={props.edge}
          index={index}
          x={waypoint.x}
          y={waypoint.y}
        />
      ))}
    </>
  );
}

function Waypoint(props: {
  edge: EdgeType,
  index: number,
  x: number,
  y: number,
}) {
  const reactFlow = useReactFlow();
  const context = useContext(DiagramContext);

  /**
   * In reaction to mouse down we register new events and handle moving around the editor.
   */
  const onStartDrag = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const diagram = document.getElementById("reactflow-diagram")!;
    let positionHasChanged = false;
    // Last moved position.
    let position = { x: props.x, y: props.y };

    const handleMove = (event: MouseEvent) => {
      position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      positionHasChanged = true;

      // Here we update locally.
      reactFlow.updateEdgeData(props.edge.id, (previous) => {
        const waypoints = replaceByIndexInArray(
          props.index,
          { x: position.x, y: position.y, anchored: null },
          (previous?.data?.waypoints as any as WaypointType[]) ?? [],
        );
        return { ...previous.data, waypoints };
      });
    };

    const removeListeners = () => {
      diagram.removeEventListener("mousemove", handleMove);
      diagram.removeEventListener("mouseleave", removeListeners);
      diagram.removeEventListener("mouseup", handleMouseUp);
    };

    const handleMouseUp = () => {
      removeListeners();
      // In addition if there was no movement it may be just a click.
      if (positionHasChanged) {
        // Report position change on end of the operation.
        context?.callbacks().onChangeWaypointPositions({
          [props.edge.id]: {
            [props.index]: { x: position.x, y: position.y }
          }
        });
      } else {
        // No movement so must be click.
        console.log("handleMouseUp", positionHasChanged);
        context?.callbacks().onDeleteWaypoint(props.edge.data!, props.index);
      }
    };

    diagram.addEventListener("mousemove", handleMove);
    diagram.addEventListener("mouseleave", removeListeners);
    diagram.addEventListener("mouseup", handleMouseUp);

  }, [props.edge, props.index, props.x, props.y, context, reactFlow]);

  return (
    <g onMouseDown={onStartDrag}>
      <circle
        cx={props.x}
        cy={props.y}
        fill="#fff"
        r={12}
        stroke="black"
        strokeWidth={1.5}
        style={{ pointerEvents: "visibleFill" }}
      />
      <path
        fill="none"
        stroke="red"
        strokeWidth={2}
        d={`M ${props.x - 4},${props.y} L ${props.x + 4},${props.y}`}
      />
    </g>
  );

}
