import { SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";
import { EntityModel } from "@dataspecer/core-v2";
import { ActionsContextType } from "../action/actions-react-binding";
import { CatalogState, SemanticModelNode, TreeNode } from "./catalog-state";
import * as Actions from "./catalog-action";
import { configuration, createLogger } from "../application";
import { Language } from "../configuration";
import { createUiModelState } from "../dataspecer/ui-model";
import { updateItemsOrder, updatePath, updateVisualEntities } from "./catalog-state-adapter";

const LOG = createLogger(import.meta.url);

export interface CatalogController {

  buildLayout: (
    aggregatorView: SemanticModelAggregatorView,
    models: Map<string, EntityModel>,
    language: Language,
  ) => void;

  onChangeLayout: (value: string) => void;

  /**
   * Handle click event.
   * We employ "event delegation" pattern.
   */
  onHandleClick: (
    action: string | undefined,
    path: number[],
    identifier: string | undefined,
    model: string | undefined,
    visible: boolean | undefined,
  ) => void;

  onChangeSearch: (value: string) => void;

}

export const useController = (
  actions: ActionsContextType,
  setState: (update: (state: CatalogState) => CatalogState) => void,
): CatalogController => {

  const buildLayout = (
    aggregatorView: SemanticModelAggregatorView,
    models: Map<string, EntityModel>,
    language: Language,
  ) => setState(state => {
    const layoutIndex = state.availableLayouts
      .findIndex(item => item === state.layout) ?? 0;

    const visualModel = aggregatorView.getActiveVisualModel();

    const uiModelState = createUiModelState(
      aggregatorView,
      [...models.values()],
      language,
      configuration().languagePreferences,
      visualModel,
      configuration().defaultModelColor);

    const availableLayoutItems = state.availableLayouts
      .map(layout => updatePath(
        updateVisualEntities(visualModel,
          updateItemsOrder(
            layout.layoutFactory(uiModelState)))));

    return {
      ...state,
      items: availableLayoutItems[layoutIndex],
      availableLayoutItems
    };
  });

  const onChangeLayout = (value: string) => setState(state => {
    const layoutIndex = state.availableLayouts
      .findIndex(item => item.identifier === value) ?? 0;
    return {
      ...state,
      layout: state.availableLayouts[layoutIndex],
      items: state.availableLayoutItems[layoutIndex],
    }
  });

  const onHandleClick = (
    action: string | undefined,
    path: number[],
    identifier: string | undefined,
    model: string | undefined,
    visible: boolean | undefined,
  ) => {
    clickHandled(actions, setState, action, path, identifier, model, visible);
  };

  const onChangeSearch = (value: string) => setState(state => {
    const sanitizedValue = value.toLocaleLowerCase();

    const filter = (item: TreeNode): boolean => {
      return item.filterText.includes(sanitizedValue);
    };

    return {
      ...state,
      search: value,
      items: updateFilter(state.items, filter),
    };
  });

  return {
    buildLayout,
    onChangeLayout,
    onHandleClick,
    onChangeSearch,
  };
}

function clickHandled(
  actions: ActionsContextType,
  setState: (update: (state: CatalogState) => CatalogState) => void,
  action: string | undefined,
  path: number[],
  identifier: string | undefined,
  model: string | undefined,
  visible: boolean | undefined,
) {
  if (action === undefined) {
    // Click outside of action buttons.
    return;
  }
  switch (action) {
  case Actions.ACTION_SEMANTIC_MODEL_CREATE:
    actions.openCreateModelDialog();
    return;
  case Actions.ACTION_SEMANTIC_MODEL_COLLAPSE_ALL:
    setState(state => collapseExpandAll(state, true));
    return;
  case Actions.ACTION_SEMANTIC_MODEL_EXPAND_ALL:
    setState(state => collapseExpandAll(state, false));
    return;
  }
  // We start with the model actions, the reason is that model actions
  // do not require "identifier" to be set.
  if (model === undefined) {
    LOG.error("Action in catalog ignored, model is not valid.", { model });
    return;
  }
  switch (action) {
  // SEMANTIC MODEL
  case Actions.ACTION_SEMANTIC_MODEL_TOGGLE_COLLAPSE:
    setState(state => {
      const node = getNode(state.items, path);
      const nextNode = {
        ...node,
        collapsed: !(node as any).collapsed
      } as SemanticModelNode;
      return setNode(state, path, nextNode);
    });
    return;
  case Actions.ACTION_SEMANTIC_MODEL_EDIT:
    actions.openEditSemanticModelDialog(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_HIDE:
    actions.removeEntitiesInSemanticModelFromVisualModel(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_SHOW:
    actions.addEntitiesFromSemanticModelToVisualModel(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_DELETE:
    actions.deleteSemanticModel(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_CREATE_CLASS:
    actions.openCreateClassDialog(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_CREATE_ASSOCIATION:
    actions.openCreateAssociationDialog(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_CREATE_ATTRIBUTE:
    actions.openCreateAttributeDialogForModel(model);
    return;
  case Actions.ACTION_SEMANTIC_MODEL_EXPAND:
    actions.openSearchExternalSemanticModelDialog(model);
    return;
  case Actions.ACTION_PROFILE_MODEL:
    actions.openProfileModelDialog(model);
    return;
  }
  // Now we continue with nodes.
  if (identifier === undefined || visible === undefined) {
    LOG.error("Action in catalog ignored, identifier is not valid.",
      { identifier, visible });
    return;
  }
  switch (action) {
  // CLASS
  case Actions.ACTION_CLASS_DELETE:
    actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
    return;
  case Actions.ACTION_CLASS_DETAIL:
    actions.openDetailDialog(identifier);
    return;
  case Actions.ACTION_CLASS_EDIT:
    actions.openModifyDialog(identifier);
    return;
  case Actions.ACTION_CLASS_FOCUS:
    actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
    return;
  case Actions.ACTION_CLASS_NEIGHBORHOOD:
    actions.addEntityNeighborhoodToVisualModel(identifier);
    return;
  case Actions.ACTION_CLASS_PROFILE:
    actions.openCreateProfileDialog(identifier);
    return;
  case Actions.ACTION_CLASS_TOGGLE_VISIBLE:
    if (visible) {
      actions.removeFromVisualModelByRepresented([identifier]);
    } else {
      actions.addClassToVisualModel(model, identifier, null);
    }
    return;
    // CLASS PROFILE
  case Actions.ACTION_CLASS_ADD_SURROUNDINGS:
    actions.addSemanticClassSurroundings(model, identifier);
    return;
  case Actions.ACTION_CLASS_RELEASE_SURROUNDINGS:
    actions.releaseSemanticClassSurroundings(model, identifier);
    return;
  case Actions.ACTION_CLASS_PROFILE_DELETE:
    actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
    return;
  case Actions.ACTION_CLASS_PROFILE_DETAIL:
    actions.openDetailDialog(identifier);
    return;
  case Actions.ACTION_CLASS_PROFILE_EDIT:
    actions.openModifyDialog(identifier);
    return;
  case Actions.ACTION_CLASS_PROFILE_FOCUS:
    actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
    return;
  case Actions.ACTION_CLASS_PROFILE_NEIGHBORHOOD:
    actions.addEntityNeighborhoodToVisualModel(identifier);
    return;
  case Actions.ACTION_CLASS_PROFILE_PROFILE:
    actions.openCreateProfileDialog(identifier);
    return;
  case Actions.ACTION_CLASS_PROFILE_TOGGLE_VISIBLE:
    if (visible) {
      actions.removeFromVisualModelByRepresented([identifier]);
    } else {
      actions.addClassProfileToVisualModel(model, identifier, null);
    }
    return;
    // GENERALIZATION
  case Actions.ACTION_GENERALIZATION_DELETE:
    actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
    return;
  case Actions.ACTION_GENERALIZATION_DETAIL:
    actions.openDetailDialog(identifier);
    return;
  case Actions.ACTION_GENERALIZATION_TOGGLE_VISIBLE:
    if (visible) {
      actions.removeFromVisualModelByRepresented([identifier]);
    } else {
      actions.addGeneralizationToVisualModel(model, identifier);
    }
    return;
    // RELATIONSHIP
  case Actions.ACTION_RELATIONSHIP_DELETE:
    actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
    return;
  case Actions.ACTION_RELATIONSHIP_DETAIL:
    actions.openDetailDialog(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_EDIT:
    actions.openModifyDialog(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_FOCUS:
    actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
    return;
  case Actions.ACTION_RELATIONSHIP_NEIGHBORHOOD:
    actions.addEntityNeighborhoodToVisualModel(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE:
    actions.openCreateProfileDialog(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_TOGGLE_VISIBLE:
    if (visible) {
      actions.removeFromVisualModelByRepresented([identifier]);
    } else {
      actions.addRelationToVisualModel(model, identifier);
    }
    return;
    // RELATIONSHIP PROFILE
  case Actions.ACTION_RELATIONSHIP_PROFILE_DELETE:
    actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE_DETAIL:
    actions.openDetailDialog(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE_EDIT:
    actions.openModifyDialog(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE_FOCUS:
    actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE_NEIGHBORHOOD:
    actions.addEntityNeighborhoodToVisualModel(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE_PROFILE:
    actions.openCreateProfileDialog(identifier);
    return;
  case Actions.ACTION_RELATIONSHIP_PROFILE_TOGGLE_VISIBLE:
    if (visible) {
      actions.removeFromVisualModelByRepresented([identifier]);
    } else {
      actions.addRelationProfileToVisualModel(model, identifier);
    }
    return;
  }
}

function getNode<T extends { items: T[] }>(
  items: T[],
  path: number[],
  depth: number = 0,
): T | undefined {
  const index = path[depth];
  const item = items[index];
  ++depth;
  if (item === undefined) {
    return undefined;
  } else if (path.length === depth) {
    return item;
  } else {
    return getNode(item.items, path, depth);
  }
}

function setNode(
  state: CatalogState,
  path: number[],
  node: TreeNode,
): CatalogState {
  const result: CatalogState = {
    ...state,
    items: [...state.items],
  };

  const updateNode = (currentNode: TreeNode, index: number): TreeNode => {
    if (path.length === index) {
      return node;
    }
    const result = {
      ...currentNode,
      items: [...state.items],
    };
    result.items[path[index]] = updateNode(node, index + 1);
    return result;
  };

  result.items[path[0]] = updateNode(node, 1);
  return result;
}

function updateFilter(
  items: TreeNode[],
  filterCallback: (item: TreeNode) => boolean,
): TreeNode[] {
  return items.map(item => {
    const result: TreeNode = {
      ...item,
      items: updateFilter(item.items, filterCallback),
      filter: false,
    };
    if (filterCallback(item)) {
      result.filter = true;
    } else {
      // We still need to keep the item visible if any
      // item is visible.
      result.filter = result.items.some(item => item.filter);
    }
    return result;
  });
}

function collapseExpandAll(
  state: CatalogState,
  collapsed: boolean,
): CatalogState {
  const updateNodes = (items: TreeNode[]): TreeNode[] => {
    return items.map(item => {
      const result = { ...item };
      if ('collapsed' in item && typeof (item as SemanticModelNode).collapsed === 'boolean') {
        (result as SemanticModelNode).collapsed = collapsed;
      }
      if (item.items.length > 0) {
        result.items = updateNodes(item.items);
      }
      return result;
    });
  };

  return {
    ...state,
    items: updateNodes(state.items),
  };
}
