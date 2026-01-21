import { useContext } from "react";
import { shallow } from "zustand/shallow";
import { type ReactFlowState, useInternalNode, useStore } from "@xyflow/react";

import { DiagramContext, NodeMenuType } from "../diagram-controller";
import { computeScreenPosition, onAddWaypoint } from "./edge-utilities";
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

  // Calculate line endpoints for each button (in pixels, assuming 1em = ~16px)
  const emToPixels = 16 * 1.35; // 1.35em font size on buttons
  const btnSize = 2 * emToPixels; // em, matches CSS var(--btn-size)
  const extraSpace = 1 * emToPixels; // em, matches CSS var(--extra-space)
  const radius = btnSize + extraSpace; // 3em total in pixels
  const angles = [0, 72, 144, 216, 288]; // degrees for 5 buttons
  const svgSize = radius * 2.5;
  const center = svgSize / 2;
  
  const lines = angles.map((angle) => {
    const radians = (angle * Math.PI) / 180;
    const x2 = center + Math.cos(radians) * radius;
    const y2 = center - Math.sin(radians) * radius; // negative because SVG y-axis is inverted
    return { x1: center, y1: center, x2, y2 };
  });

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
