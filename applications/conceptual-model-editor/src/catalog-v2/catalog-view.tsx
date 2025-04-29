import React, { useCallback, useEffect, useState } from "react";
import { CatalogController } from "./catalog-controller";
import {
  CLASS_NODE_TYPE,
  CLASS_PROFILE_NODE_TYPE,
  GENERALIZATION_NODE_TYPE,
  SEMANTIC_MODEL_NODE_TYPE,
  ClassNode,
  ClassProfileNode,
  RelationshipNode,
  SemanticModelNode,
  TreeNode,
  RelationshipProfileNode,
  RELATIONSHIP_NODE_TYPE,
  RELATIONSHIP_PROFILE_NODE_TYPE,
  GeneralizationNode,
  CatalogState,
} from "./catalog-state";
import { t } from "../application";
import { ACTION_SEMANTIC_MODEL_CREATE } from "./catalog-action";
import { CatalogLayout } from "./catalog-layout";

type Component<T> = (props: { node: T }) => React.ReactNode;

export type Components = {
  [SEMANTIC_MODEL_NODE_TYPE]?: Component<SemanticModelNode>,
  [CLASS_NODE_TYPE]?: Component<ClassNode>,
  [CLASS_PROFILE_NODE_TYPE]?: Component<ClassProfileNode>,
  [RELATIONSHIP_NODE_TYPE]?: Component<RelationshipNode>,
  [RELATIONSHIP_PROFILE_NODE_TYPE]?: Component<RelationshipProfileNode>,
  [GENERALIZATION_NODE_TYPE]?: Component<GeneralizationNode>,
}

//

export function renderCatalogTree(
  controller: CatalogController,
  state: CatalogState,
) {
  return <CatalogTree controller={controller} state={state} />
}

function CatalogTree({ controller, state }: {
  controller: CatalogController,
  state: CatalogState,
}) {

  return (
    <div className="flex flex-col h-full">
      <CatalogTabHeader state={state} controller={controller} />
      <CatalogSearchBar state={state} controller={controller} />
      <CatalogItemsMemoized
        layout={state.layout} items={state.items}
        controller={controller} />
    </div>
  )
}

function CatalogTabHeader({ state, controller }: {
  controller: CatalogController,
  state: CatalogState,
}) {
  return (
    <div className="flex flex-row [&>*]:mx-2 flex-wrap py-1 border-b-2 border-gray-300">
      {state.availableLayouts.map(item => (
        <CatalogTabButton
          key={item.identifier}
          active={item === state.layout}
          onClick={() => controller.onChangeLayout(item.identifier)}
          label={t(item.label)}
        />
      ))}
    </div>
  )
}

function CatalogSearchBar({ state, controller }: {
  controller: CatalogController,
  state: CatalogState,
}) {
  // We use local state for a debounce.
  const [value, setValue] = useState(state.search);

  // Update from props.
  useEffect(() => setValue(state.search), [state.search]);

  // Debounce.
  React.useEffect(() => {
    const times = setTimeout(() => controller.onChangeSearch(value), 200)
    return () => clearTimeout(times)
  }, [value])

  const onClear = () => {
    setValue("");
    controller.onChangeSearch("");
  };

  return (
    <div className="flex p-2 gap-2">
      <input
        className="grow" type="text"
        value={value}
        onChange={event => setValue(event.target.value)}
        title={t("catalog.search-title")}
      />
      <button
        className="border px-2"
        onClick={onClear}
      >
        {t("catalog.clear")}
      </button>
    </div>
  )
}

function CatalogTabButton(props: {
  label: string,
  active: boolean,
  onClick: () => void,
}) {
  return (
    <button
      disabled={props.active}
      onClick={props.onClick}
      className={props.active ? "font-bold" : ""}
    >
      {props.label}
    </button>
  );
};

const CatalogItemsMemoized = React.memo(CatalogItems);

function CatalogItems({ layout, items, controller }: {
  layout: CatalogLayout,
  items: TreeNode[],
  controller: CatalogController,
}) {
  const onClick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const parent = (event.target as any).parentElement;
    controller.onHandleClick(
      (event.target as any).dataset.action,
      (parent.dataset.path ?? "").split(",").map(Number),
      parent.dataset.identifier,
      parent.dataset.model,
      parent.dataset.visible === "1",
    )
  }, [controller]);

  return (
    <div
      className="flex flex-col overflow-y-scroll h-full"
      onClick={onClick}
    >
      {renderItems(layout.toolbars, items)}
      {layout.showAddModel ? (
        <div className="flex flex-row justify-end">
          <button
            className="hover:bg-slate-200"
            data-action={ACTION_SEMANTIC_MODEL_CREATE}
          >
            ➕
          </button>
        </div>
      ) : null}
    </div>
  )
}

function renderItems(toolbars: Components, items: TreeNode[]) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul>
      {items.map(item => (
        <li key={item.identifier} className={`${item.filter ? "" : "hidden"}`}>
          {renderItem(toolbars, item)}
        </li>
      ))}
    </ul>
  )
}

function renderItem(toolbars: Components, item: TreeNode) {
  switch (item.type) {
  case SEMANTIC_MODEL_NODE_TYPE:
    return renderSemanticModelNode(
      toolbars, item as SemanticModelNode);
  case CLASS_NODE_TYPE:
    return renderClassNode(
      toolbars, item as ClassNode);
  case CLASS_PROFILE_NODE_TYPE:
    return renderClassProfileNode(
      toolbars, item as ClassProfileNode);
  case RELATIONSHIP_NODE_TYPE:
    return renderRelationshipNode(
      toolbars, item as RelationshipNode);
  case RELATIONSHIP_PROFILE_NODE_TYPE:
    return renderRelationshipProfileNode(
      toolbars, item as RelationshipProfileNode);
  case GENERALIZATION_NODE_TYPE:
    return renderGeneralizationNode(
      toolbars, item as GeneralizationNode);
  }
}

/**
 * This is designed to be the top level.
 */
function renderSemanticModelNode(
  toolbars: Components, node: SemanticModelNode,
) {
  const toolbar = toolbars[SEMANTIC_MODEL_NODE_TYPE];
  return (
    <>
      <NodeWrap
        toolbar={toolbar}
        node={node}
        prefix="Ⓜ"
      />
      {node.collapsed ? null : renderItems(toolbars, node.items)}
    </>
  )
}

function NodeWrap<T extends TreeNode>(props: {
  toolbar: Component<T> | undefined,
  node: T,
  prefix: string,
  className?: string,
}) {
  const node = props.node;
  //
  const Toolbar = props.toolbar;
  const level = Math.max(0, props.node.path.length - 2);
  const spacing = "\u00A0".repeat(level * 2);
  return (
    <div
      className={"flex justify-between " + (props.className ?? "")}
      style={{ backgroundColor: node.displayColor }}
    >
      <span>
        {props.prefix}
        {spacing}
        {level > 0 ? "└ " : ""}
        {props.node.displayLabel}
      </span>
      {Toolbar === undefined ? null : <Toolbar node={props.node} />}
    </div>
  )
}

function renderClassNode(
  toolbars: Components, node: ClassNode
) {
  const toolbar = toolbars[CLASS_NODE_TYPE];
  return (
    <>
      <NodeWrap
        toolbar={toolbar}
        node={node}
        prefix="📑"
      />
      {renderItems(toolbars, node.items)}
    </>
  )
}

function renderClassProfileNode(
  toolbars: Components, node: ClassProfileNode
) {
  const toolbar = toolbars[CLASS_PROFILE_NODE_TYPE];
  return (
    <>
      <NodeWrap
        toolbar={toolbar}
        node={node}
        prefix="📑"
      />
      {renderItems(toolbars, node.items)}
    </>
  )
}

function renderRelationshipNode(
  toolbars: Components, node: RelationshipNode
) {
  const toolbar = toolbars[RELATIONSHIP_NODE_TYPE];
  return (
    <>
      <NodeWrap
        toolbar={toolbar}
        node={node}
        prefix="📑"
      />
      {renderItems(toolbars, node.items)}
    </>
  )
}

function renderRelationshipProfileNode(
  toolbars: Components, node: RelationshipProfileNode,
) {
  const toolbar = toolbars[RELATIONSHIP_PROFILE_NODE_TYPE];
  return (
    <>
      <NodeWrap
        toolbar={toolbar}
        node={node}
        prefix="📑"
      />
      {renderItems(toolbars, node.items)}
    </>
  )
}

function renderGeneralizationNode(
  toolbars: Components, node: GeneralizationNode
) {
  const toolbar = toolbars[GENERALIZATION_NODE_TYPE];
  return (
    <>
      <NodeWrap
        toolbar={toolbar}
        node={node}
        prefix="📑"
      />
      {renderItems(toolbars, node.items)}
    </>
  )
}
