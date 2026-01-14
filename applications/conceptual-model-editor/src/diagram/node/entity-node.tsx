import { useContext } from "react";
import {
  Handle,
  type Node,
  type NodeProps,
  NodeToolbar,
  Position,
} from "@xyflow/react";

import {
  DiagramOptions,
  EntityColor,
  LabelVisual,
  ProfileOfVisual,
} from "../model";
import {
  isNodeRelationshipItem,
  isNodeTitleItem,
  NodeRelationshipItem,
  NodeTitleItem,
  NodeType,
  type Node as ApiNode,
} from "../diagram-model";
import { DiagramContext, NodeMenuType } from "../diagram-controller";

import "./entity-node.css";
import { t } from "../../application";
import { SelectionMenu } from "./selection-menu";

// We can select zoom option and hide content when zoom is on given threshold.
// const zoomSelector = (state: ReactFlowState) => state.transform[2] >= 0.9;
// Following in the entity:
// const showContent = useStore(zoomSelector);

export const EntityNode = (props: NodeProps<Node<ApiNode>>) => {
  // We can use the bellow to set size based on the content.
  // useLayoutEffect(() => {
  //   if (inputRef.current) {
  //     inputRef.current.style.width = `${data.label.length * 8}px`;
  //   }
  // }, [data.label.length]);

  // We can use bellow to get information about active connection
  // and for example highligh possible targets.
  // const connection = useConnection()

  const data = props.data;

  const description: undefined | string = data.description ?? undefined;

  const context = useContext(DiagramContext);

  const moveItemUp = (identifier: string) => () =>
    context?.callbacks().onMoveAttributeUp(identifier, props.data.identifier);
  const moveItemDown = (identifier: string) => () =>
    context?.callbacks().onMoveAttributeDown(identifier, props.data.identifier);
  const removeItem = (identifier: string) => () =>
    context?.callbacks().onRemoveAttributeFromNode(identifier, props.data.identifier);
  const editItem = (identifier: string) => () => {
    context?.callbacks().onEditEntityItem(identifier);
  }

  // When we use IRI instead of a label we do not show the IRI again.
  const hideIri = data.options.labelVisual === LabelVisual.Iri;
  const label = prepareLabel(data.options, data);
  const mainColor = prepareColor(data);
  const isSingleNodeSelected = context?.getShownNodeMenuType() === NodeMenuType.SingleNodeMenu;

  return (
    <>
      <div className={"border border-black entity-node min-h-14 min-w-56"}>
        <EntityNodeMenu {...props} />
        <div className="entity-node-content">

          <div className="drag-handle bg-slate-300 p-1"
            style={{ backgroundColor: mainColor }}
            title={description}
          >
            <div className="relative flex w-full flex-row justify-between">
              <div>{label}</div>
              {data.position.anchored ? <div>⚓</div> : null}
            </div>
            <ProfileOf
              options={data.options}
              profileOf={data.profileOf}
            />
          </div>
          {hideIri ? null : <div className="overflow-x-clip text-gray-500 px-1">
            {data.iri}
          </div>}
          {data.items.map((item, index) => {
            if (isNodeRelationshipItem(item)) {
              return (
                <li
                  key={`${item.identifier}-li`}
                  className="relative flex w-full flex-row justify-between z-50"
                >
                  <RelationshipItem
                    options={data.options}
                    data={item}
                    showToolbar={props.selected && isSingleNodeSelected}
                    onEdit={editItem}
                    onMoveUp={moveItemUp}
                    onMoveDown={moveItemDown}
                    onRemove={removeItem}
                  />
                </li>
              );
            } else if (isNodeTitleItem(item)) {
              return (
                <li
                  key={`${index}-${item.title}-li`}
                  className="relative flex w-full flex-row justify-between z-50"
                >
                  <TitleItem item={item} />
                </li>
              );
            } else {
              console.error("Unknown node item.", { item });
              return null;
            }
          })
          }
        </div>
        {/* We need a permanent source and target. */}
        <Handle type="target" position={Position.Right} />
        <Handle type="source" position={Position.Right} />
      </div>
    </>
  );
};

function prepareLabel(
  options: DiagramOptions,
  data: {
    label: string | null,
    iri: string | null,
    vocabulary: { label: string | null }[],
  },
) {
  switch (options.labelVisual) {
  case LabelVisual.Entity:
    return data.label;
  case LabelVisual.Iri:
    return data.iri;
  case LabelVisual.VocabularyOrEntity:
    return data.vocabulary
      .map(item => item.label)
      .filter(item => item !== null)
      .join(", ");
  }
}

function prepareColor(data: ApiNode) {
  switch (data.options.entityMainColor) {
  case EntityColor.Entity:
    return data.color;
  case EntityColor.VocabularyOrEntity:
    if (data.vocabulary.length === 0) {
      return data.color;
    }
    // Just use the first one.
    return data.vocabulary[0].color;
  }
}

function ProfileOf({ options, profileOf }: {
  options: DiagramOptions,
  profileOf: {
    label: string | null,
    iri: string | null,
  }[],
}) {
  if (profileOf.length === 0) {
    return null;
  }
  let labels: (string | null)[] = [];
  switch (options.profileOfVisual) {
  case ProfileOfVisual.Entity:
    labels = profileOf.map(item => item.label);
    break;
  case ProfileOfVisual.Iri:
    labels = profileOf.map(item => item.iri);
    break;
  case ProfileOfVisual.None:
    return;
  }
  return (
    <div className="text-gray-600">
      {options.profileOfLabel}&nbsp;
      <ul className="inline-grid">
        {labels.filter(item => item !== null)
          .map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  )
}

function EntityNodeMenu(props: NodeProps<Node<ApiNode>>) {
  const context = useContext(DiagramContext);
  if (context === null) {
    return null;
  }

  const isCanvasToolbarOpen = context.openedCanvasMenu !== null;
  if (isCanvasToolbarOpen) {
    return null;
  }

  if (context.getShownNodeMenuType() === NodeMenuType.SingleNodeMenu) {
    return <PrimaryNodeMenu {...props} />;
  } else if (context.getShownNodeMenuType() === NodeMenuType.SelectionMenu) {
    return <SelectionMenu {...props} />;
  }
  else {
    console.error("Missing node menu of required type:",
      context.getShownNodeMenuType());
    return null;
  }
}

function PrimaryNodeMenu(props: NodeProps<Node<ApiNode>>) {
  const context = useContext(DiagramContext);

  const isPartOfGroup = props.data.group !== null;

  const onShowDetail = () => context?.callbacks().onShowNodeDetail(props.data);
  const onEdit = () => context?.callbacks().onEditRepresentedByNode(props.data);
  const onCreateProfile = () => context?.callbacks().onCreateNodeProfile(props.data);
  const onDuplicateNode = () => context?.callbacks().onDuplicateNode(props.data);
  const onHide = () => context?.callbacks().onHideNode(props.data);
  const onDelete = () => context?.callbacks().onDeleteNode(props.data);
  const onAnchor = () => context?.callbacks().onToggleAnchorForNode(props.data.identifier);
  const onDissolveGroup = () => context?.callbacks().onDissolveGroup(props.data.group);
  const onAddAttribute = () => context?.callbacks().onCreateAttributeForNode(props.data);
  const onEditAttributes = () => context?.callbacks().onEditVisualNode(props.data);
  const onShowExpandSelection = () => context?.callbacks().onShowExpandSelection();

  const shouldShowToolbar = props.selected === true;

  const addAttributeTitle = props.data.type === NodeType.Class ?
    t("node-add-attribute") : t("node-add-attribute-profile");

  return (
    <>
      <NodeToolbar isVisible={shouldShowToolbar} position={Position.Top} className="flex gap-2 entity-node-menu" >
        <button onClick={onShowDetail} title={t("class-detail-button")}>ℹ</button>
        &nbsp;
        <button onClick={onEdit} title={t("class-edit-button")}>✏️</button>
        &nbsp;
        <button onClick={onCreateProfile} title={t("class-profile-button")}>🧲</button>
        &nbsp;
        <button onClick={onEditAttributes} title={t("edit-node-attributes-visiblity-button")}>📏</button>
        &nbsp;
        <button onClick={onDuplicateNode} title={t("duplicate-node-button")}>⿻</button>
        &nbsp;
      </NodeToolbar>
      <NodeToolbar isVisible={shouldShowToolbar} position={Position.Right} className="flex gap-2 entity-node-menu" >
        <Handle type="source" position={Position.Right} title={t("node-connection-handle")}>🔗</Handle>
      </NodeToolbar>
      {
        !isPartOfGroup ? null :
          <NodeToolbar isVisible={shouldShowToolbar} position={Position.Left} className="flex gap-2 entity-node-menu" >
            <button onClick={onDissolveGroup} title={t("dissolve-group-button")}>⛓️‍💥</button>
          </NodeToolbar>
      }
      <NodeToolbar isVisible={shouldShowToolbar} position={Position.Bottom} className="flex gap-2 entity-node-menu" >
        <button onClick={onHide} title={t("class-hide-button")}>🕶</button>
        &nbsp;
        <button onClick={onDelete} title={t("class-remove-button")}>🗑</button>
        &nbsp;
        <button
          onClick={onAnchor}
          title={isPartOfGroup ? t("group-anchor-button") : t("node-anchor-button")} >
          ⚓
        </button>
        &nbsp;
        <button onClick={onAddAttribute} title={addAttributeTitle} >➕</button>
        &nbsp;
        <button onClick={onShowExpandSelection} title={t("selection-extend-button")} >📈</button>
        &nbsp;
      </NodeToolbar>
    </>);
}

function RelationshipItem(props: {
  options: DiagramOptions,
  data: NodeRelationshipItem,
  showToolbar: boolean,
  onMoveUp: (identifier: string) => () => void | undefined,
  onMoveDown: (identifier: string) => () => void | undefined,
  onRemove: (identifier: string) => () => void | undefined,
  onEdit: (identifier: string) => () => void | undefined,
}) {
  const data = props.data;
  const label = prepareLabel(data.options, data);
  return (
    <>
      <div className="flex">
        <span>
          - {label}&nbsp;
        </span>
        <ProfileOf options={data.options} profileOf={data.profileOf} />
        <Cardinality options={data.options} data={data} />
      </div>
      {props.showToolbar ? (
        <div>
          <button onClick={props.onMoveUp(data.identifier)}>🔼</button>
          <button onClick={props.onMoveDown(data.identifier)}>🔽</button>
          <button onClick={props.onRemove(data.identifier)}>🕶️</button>
          <button onClick={props.onEdit(data.identifier)}>✏️</button>
        </div>
      ) : null}
    </>
  );
}

function Cardinality({ options, data }: {
  options: DiagramOptions,
  data: NodeRelationshipItem,
}) {
  if (!options.displayRangeDetail || data.cardinalityTarget === null) {
    return null;
  }
  return (
    <span>
      &nbsp;{data.cardinalityTarget}
    </span>
  )
}

function TitleItem(props: {
  item: NodeTitleItem,
}) {
  return (
    <span className="ml-2">
      {props.item.title}
    </span>
  )
}

export const EntityNodeName = "entity-node";
