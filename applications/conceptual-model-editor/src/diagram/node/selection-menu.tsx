import { Node, NodeProps, NodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { useContext } from "react";
import { DiagramContext } from "../diagram-controller";
import { t } from "@/application";
import { DiagramNodeTypes } from "../diagram-model";

import "./entity-node.css";

export function SelectionMenu(props: NodeProps<Node<DiagramNodeTypes>>) {
  const context = useContext(DiagramContext);
  const reactFlow = useReactFlow();
  const shouldShowMenu = context?.getNodeWithMenu() === props.id;

  if (!shouldShowMenu) {
    return null;
  }

  const onShowSelectionActions = (event: React.MouseEvent) => {
    const absoluteFlowPosition = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    context?.callbacks().onShowSelectionActionsMenu(props.data, absoluteFlowPosition);
  }
  const onLayoutSelection = () => context?.callbacks().onLayoutSelection();
  const onCreateGroup = () => {
    context?.callbacks().onCreateGroup();
  };
  const onShowExpandSelection = () => context?.callbacks().onShowExpandSelection();
  const onShowFilterSelection = () => context?.callbacks().onShowFilterSelection();
  const onCreateVisualDiagramNode = () => context?.callbacks().onCreateVisualModelDiagramNodeFromSelection();
  const onOpenAlignmentMenu = (event: React.MouseEvent) => {
    const absoluteFlowPosition = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    context?.callbacks().onOpenAlignmentMenu(props.data, absoluteFlowPosition);
  }

  // Prevent canvas dragging when clicking/dragging on buttons
  const preventDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (<>
    <NodeToolbar isVisible={shouldShowMenu} position={Position.Top} className="flex gap-2 entity-node-menu nopan" >
      <button onClick={onShowSelectionActions} onPointerDown={preventDrag} title={t("selection-action-button")}>🎬</button>
      &nbsp;
      <button onClick={onLayoutSelection} onPointerDown={preventDrag} title={t("selection-layout-button")}>🔀</button>
      &nbsp;
      <button onClick={(event) => onOpenAlignmentMenu(event)} onPointerDown={preventDrag}>
        { /* https://www.svgrepo.com/svg/535125/align-left */}
        <svg width="24px" height="24px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1H3V15H1V1Z" fill="#000000" />
          <path d="M5 13H15V9H5V13Z" fill="#000000" />
          <path d="M11 7H5V3H11V7Z" fill="#000000" />
        </svg>
      </button>
    </NodeToolbar>
    <NodeToolbar isVisible={shouldShowMenu} position={Position.Left} className="flex gap-2 entity-node-menu nopan" >
      <button
        onClick={onCreateVisualDiagramNode}
        onPointerDown={preventDrag}
        title={t("visual-diagram-node-create-from-selection-button")}
      >
        📦
      </button>
    </NodeToolbar>
    <NodeToolbar isVisible={shouldShowMenu} position={Position.Right} className="flex gap-2 entity-node-menu nopan" >
      <button onClick={onCreateGroup} onPointerDown={preventDrag} title={t("selection-group-button")}>⛓️</button>
    </NodeToolbar>
    <NodeToolbar isVisible={shouldShowMenu} position={Position.Bottom} className="flex gap-2 entity-node-menu nopan" >
      <button onClick={onShowExpandSelection} onPointerDown={preventDrag} title={t("selection-extend-button")} >📈</button>
      &nbsp;
      <button onClick={onShowFilterSelection} onPointerDown={preventDrag} title={t("selection-filter-button")} >📉</button>
      &nbsp;
    </NodeToolbar>
  </>
  );
}