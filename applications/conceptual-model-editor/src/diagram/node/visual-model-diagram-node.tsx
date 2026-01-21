import { useContext } from "react";
import {
  Handle,
  type Node,
  type NodeProps,
  NodeToolbar,
  Position,
} from "@xyflow/react";

import { DiagramContext, NodeMenuType } from "../diagram-controller";

import "./visual-model-diagram-node.css";
import { t } from "../../application";
import { SelectionMenu } from "./selection-menu";
import { VisualModelDiagramNode } from "../diagram-model";

export const VisualModelNode = (props: NodeProps<Node<VisualModelDiagramNode>>) => {
  const data = props.data;

  return (
    <div className="cube-container">
      <div className="front-text">
        {data.label}
      </div>
      <div className="front-text-secondary text-gray-500">
        {`Represents ${props.data.representedModelAlias}`}
      </div>
      <div className="front-text-secondary text-gray-500">
        {`Represents ${props.data.representedModelAlias}`}
        {data.position.anchored ? <div>⚓</div> : null}
      </div>
      <div className="cube">
        <EntityNodeMenu {...props} />
        <div className="face front-face">
          {/* This text is actually invisible it is just to get correct width */}
          <div className="px-8">{data.label}</div>
          <div className="overflow-x-clip px-8">
            {`Represents ${props.data.representedModelAlias}`}
          </div>
        </div>
        <div className="face top-face"></div>
        <div className="face left-face"></div>
        <Handle className="handle" type="target" position={Position.Right} />
        <Handle className="handle" type="source" position={Position.Right} />
      </div>
    </div>
  );
};

function EntityNodeMenu(props: NodeProps<Node<VisualModelDiagramNode>>) {
  const context = useContext(DiagramContext);
  if (context === null) {
    return null;
  }

  const isCanvasToolbarOpen = context.openedCanvasMenu !== null;
  if (isCanvasToolbarOpen) {
    return null;
  }

  if (context.getShownNodeMenuType() === NodeMenuType.SingleNodeMenu) {
    return <PrimaryVisualModelNodeMenu {...props} />;
  }
  else if (context.getShownNodeMenuType() === NodeMenuType.SelectionMenu) {
    return <SelectionMenu {...props} />;
  }
  else {
    console.error("Missing node menu");
    return null;
  }
}

function PrimaryVisualModelNodeMenu(props: NodeProps<Node<VisualModelDiagramNode>>) {
  const context = useContext(DiagramContext);

  const isPartOfGroup = props.data.group !== null;

  const onMoveToSourceVisualModel = () =>
    context?.callbacks().onMoveToVisualModelRepresentedByVisualModelDiagramNode(props.data.identifier);
  const onEditVisualModelNode = () => context?.callbacks().onEditVisualModelDiagramNode(props.data);
  const onHideVisualModelNode = () => context?.callbacks().onHideNode(props.data);
  const onDissolveVisualModelNode = () => context?.callbacks().onDissolveVisualModelDiagramNode(props.data);
  const onShowDetail = () => context?.callbacks().onShowInfoForVisualModelDiagramNode(props.data);

  const onAnchor = () => context?.callbacks().onToggleAnchorForNode(props.data.identifier);
  const onDissolveGroup = () => context?.callbacks().onDissolveGroup(props.data.group);

  const onDuplicateNode = () => context?.callbacks().onDuplicateNode(props.data);

  const onAddAllRelationships = () => context?.callbacks().onAddAllRelationships(props.data);

  const shouldShowToolbar = props.selected === true;

  // Prevent canvas dragging when clicking/dragging on buttons
  const preventDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <NodeToolbar isVisible={shouldShowToolbar} position={Position.Top} className="flex gap-2 entity-node-menu" >
        <button
          onClick={onMoveToSourceVisualModel}
          onPointerDown={preventDrag}
          title={t("visual-diagram-node-move-to-source-visual-model-button")}
        >
          🗺️
        </button>
        &nbsp;
        <button onClick={onShowDetail} onPointerDown={preventDrag} title={t("visual-diagram-node-detail-button")}>ℹ</button>
        &nbsp;
        <button onClick={onEditVisualModelNode} onPointerDown={preventDrag} title={t("visual-diagram-node-edit-button")}>✏️</button>
        &nbsp;
        <button onClick={onDuplicateNode} onPointerDown={preventDrag} title={t("duplicate-node-button")}>⿻</button>
        &nbsp;
      </NodeToolbar>
      {
        !isPartOfGroup ? null :
          <NodeToolbar isVisible={shouldShowToolbar} position={Position.Left} className="flex gap-2 entity-node-menu" >
            <button onClick={onDissolveGroup} onPointerDown={preventDrag} title={t("dissolve-group-button")}>⛓️‍💥</button>
          </NodeToolbar>
      }
      <NodeToolbar isVisible={shouldShowToolbar} position={Position.Bottom} className="flex gap-2 entity-node-menu" >
        <button onClick={onAddAllRelationships} onPointerDown={preventDrag} title={t("visual-diagram-node-add-relationships-button")}>🌳</button>
        &nbsp;
        <button onClick={onHideVisualModelNode} onPointerDown={preventDrag} title={t("visual-diagram-node-hide-button")}>🕶</button>
        &nbsp;
        <button
          onClick={onAnchor}
          onPointerDown={preventDrag}
          title={isPartOfGroup ? t("group-anchor-button") : t("node-anchor-button")}
        >
          ⚓
        </button>
        &nbsp;
        <button onClick={onDissolveVisualModelNode} onPointerDown={preventDrag} title={t("visual-diagram-node-dissolve-button")} >💥</button>
        &nbsp;
      </NodeToolbar>
    </>);
}

export const VisualModelNodeName = "visual-model-diagram-node";
