import { useContext } from "react";
import { shallow } from "zustand/shallow";
import { type ReactFlowState, useInternalNode, useStore } from "@xyflow/react";

import { DiagramContext, NodeMenuType } from "../diagram-controller";
import { computeScreenPosition, onAddWaypoint, calculateEdgeToolbarLines } from "./edge-utilities";
import { EdgeToolbarProps, viewportStoreSelector } from "./edge-toolbar";
import { Edge } from "../diagram-model";
import { ToolbarPortal } from "../canvas/toolbar-portal";

/**
 * As we can not render edge menu on a single place, like node menu, we
 * extracted the menu into a separate component.
 */
export function ProfileEdgeToolbar({ value }: { value: EdgeToolbarProps | null }) {
  const context = useContext(DiagramContext);
  const edge = useStore((state: ReactFlowState) => state.edgeLookup.get(value?.edgeIdentifier ?? ""));
  const { x, y, zoom } = useStore(viewportStoreSelector, shallow);

  // We must call the hooks before making any "if" statement.
  const data = edge?.data as Edge;
  const sourceNode = useInternalNode(data?.source ?? "");
  const targetNode = useInternalNode(data?.target ?? "");

  if (value === null || data === undefined || !edge?.selected ||
    context === null || sourceNode === undefined || targetNode === undefined ||
    context.getShownNodeMenuType() !== NodeMenuType.SingleNodeMenu) {
    return null;
  }

  const position = computeScreenPosition(value.x, value.y, { x, y, zoom });

  const onDetail = () => context?.callbacks().onShowEdgeDetail(data);
  const addWaypoint = () => onAddWaypoint(
    context, sourceNode, targetNode, data, value);

  // Calculate SVG lines for connecting buttons to center
  const { svgSize, lines } = calculateEdgeToolbarLines();

  return (
    <>
      <ToolbarPortal>
        <div className="edge-toolbar" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
          <svg 
            className="edge-toolbar-lines" 
            style={{
              position: "absolute",
              width: `${svgSize}px`,
              height: `${svgSize}px`,
              left: `${-svgSize/2}px`,
              top: `${-svgSize/2}px`,
              pointerEvents: "none",
              zIndex: 1,
            }}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
          >
            {lines.map((line, index) => (
              <line
                key={index}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#333"
                strokeWidth="2"
              />
            ))}
          </svg>
          <div className="property-edge">
            <button onClick={onDetail}>ℹ</button>
            <ul className="edge-toolbar">
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li>
                <button onClick={addWaypoint}>X</button>
              </li>
            </ul>
          </div>
        </div>
      </ToolbarPortal>
    </>
  );
}
