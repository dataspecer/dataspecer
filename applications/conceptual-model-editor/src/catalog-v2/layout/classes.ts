import { isUiClass, isUiClassProfile, UiModelState, UiSemanticModel } from "../ui-model";
import {
  uiClassProfileToNode,
  uiClassToNode,
  uiSemanticModelToNode,
} from "../catalog-state-adapter";
import { CatalogLayout } from "../catalog-layout";
import * as State from "../catalog-state";
import * as Toolbars from "../catalog-toolbar";
import {
  addChildrenToNode,
  addGeneralizationsToChildren,
  addProfilesToChildren,
  filterByModel,
  NodeChildren,
} from "./layout-utilities";
import { CmeSemanticModelType } from "@/dataspecer/cme-model";
import { ACTION_SEMANTIC_MODEL_CREATE_CLASS, ACTION_SEMANTIC_MODEL_EXPAND } from "../catalog-action";

/**
 * - model
 *  - class
 *    - class profile
 *      - ...
 *    - class profile
 *  - class
 * - model
 *  - class
 *  - class
 */
export const classesLayout: CatalogLayout = {
  identifier: "class",
  label: "model.classes",
  layoutFactory: classesLayoutFactory,
  toolbars: {
    [State.SEMANTIC_MODEL_NODE_TYPE]: Toolbars.SemanticModelGroupToolbar,
    [State.CLASS_NODE_TYPE]: Toolbars.ClassToolbar,
    [State.CLASS_PROFILE_NODE_TYPE]: Toolbars.ClassProfileToolbar,
  },
};

function classesLayoutFactory(
  uiModelState: UiModelState,
): State.TreeNode[] {
  const children: NodeChildren = {};
  addProfilesToChildren(
    children, uiModelState.classProfiles, uiClassProfileToNode);
  addGeneralizationsToChildren(
    children, uiModelState.generalizations,
    (item) => {
      if (isUiClass(item)) {
        return uiClassToNode(item);
      } else if (isUiClassProfile(item)) {
        return uiClassProfileToNode(item);
      } else {
        return null;
      }
    }
  )

  return uiModelState.semanticModels.map((model) => {
    const node = uiSemanticModelToNode(model);
    node.items = entitiesToNodes(uiModelState, children, model);
    if (model.modelType === CmeSemanticModelType.ExternalSemanticModel) {
      node.addEntityAction = {
        action: ACTION_SEMANTIC_MODEL_EXPAND,
        title: "catalog.model.extend-external",
      }
    } else {
      node.addEntityAction = {
        action: ACTION_SEMANTIC_MODEL_CREATE_CLASS,
        title: "catalog.model.create-class",
      }
    }
    return node;
  });
};

function entitiesToNodes(
  uiModelState: UiModelState,
  children: NodeChildren,
  semanticModel: UiSemanticModel,
): State.TreeNode[] {
  return filterByModel(uiModelState.classes, semanticModel)
    .map(item => uiClassToNode(item))
    .map(item => addChildrenToNode(children, item, []));
}
