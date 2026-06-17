import { UiModelState, UiSemanticModel } from "../ui-model";
import {
  uiClassProfileToNode,
  uiRelationshipProfileToNode,
  uiSemanticModelToNode,
} from "../catalog-state-adapter";
import { CatalogLayout } from "../catalog-layout";
import * as State from "../catalog-state";
import * as Toolbars from "../catalog-toolbar";
import { addChildrenToNode, addProfilesToChildren, filterByModel, NodeChildren } from "./layout-utilities";

/**
 * - model
 *  - profile
 *  - profile
 * - model
 *  - profile
 *  - profile
 */
export const profilesLayout: CatalogLayout = {
  identifier: "profile",
  label: "model.profiles",
  layoutFactory: profilesLayoutFactory,
  toolbars: {
    [State.SEMANTIC_MODEL_NODE_TYPE]: Toolbars.SemanticModelGroupToolbar,
    [State.CLASS_PROFILE_NODE_TYPE]: Toolbars.ClassProfileToolbar,
    [State.RELATIONSHIP_PROFILE_NODE_TYPE]: Toolbars.RelationshipProfileToolbar,
  },
};

function profilesLayoutFactory(
  uiModelState: UiModelState,
): State.TreeNode[] {
  const children: NodeChildren = {};
  addProfilesToChildren(
    children, uiModelState.classProfiles, uiClassProfileToNode);
  addProfilesToChildren(
    children, uiModelState.relationshipProfiles, uiRelationshipProfileToNode);

  return uiModelState.semanticModels.map((model) => {
    const node = uiSemanticModelToNode(model);
    node.items = entitiesToNodes(
      uiModelState, children, model);
    return node;
  });
};

const entitiesToNodes = (
  uiModelState: UiModelState,
  children: NodeChildren,
  semanticModel: UiSemanticModel,
): State.TreeNode[] => {

  const classProfiles = filterByModel(uiModelState.classProfiles, semanticModel)
    .map(item => uiClassProfileToNode(item))
    .map(item => addChildrenToNode(children, item, []));

  const relationshipProfiles = filterByModel(
    uiModelState.relationshipProfiles, semanticModel)
    .map(item => uiRelationshipProfileToNode(item))
    .map(item => addChildrenToNode(children, item, []));

  return [
    ...classProfiles,
    ...relationshipProfiles,
  ];
}
