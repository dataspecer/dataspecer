import { isComplexType } from "@dataspecer/core-v2/semantic-model/datatypes";
import { UiModelState, UiSemanticModel } from "../ui-model";
import {
  uiRelationshipProfileToNode,
  uiRelationshipToNode,
  uiSemanticModelToNode,
} from "../catalog-state-adapter";
import { CatalogLayout } from "../catalog-layout";
import * as State from "../catalog-state";
import * as Toolbars from "../catalog-toolbar";
import { addChildrenToNode, addProfilesToChildren, filterByModel, NodeChildren } from "./layout-utilities";
import { CmeSemanticModelType } from "../../dataspecer/cme-model";
import { ACTION_SEMANTIC_MODEL_CREATE_ASSOCIATION } from "../catalog-action";

/**
 * - model
 *  - association
 *    - association profile
 *      - ...
 *    - association profile
 *  - association
 * - model
 *  - association
 *  - association
 */
export const associationsLayout: CatalogLayout = {
  identifier: "association",
  label: "model.relationship",
  layoutFactory: associationsLayoutFactory,
  toolbars: {
    [State.SEMANTIC_MODEL_NODE_TYPE]: Toolbars.SemanticModelGroupToolbar,
    [State.RELATIONSHIP_NODE_TYPE]: Toolbars.RelationshipToolbar,
    [State.RELATIONSHIP_PROFILE_NODE_TYPE]: Toolbars.RelationshipProfileToolbar,
  },
};

function associationsLayoutFactory(
  uiModelState: UiModelState,
): State.TreeNode[] {
  const children: NodeChildren = {};
  addProfilesToChildren(
    children, uiModelState.relationshipProfiles, uiRelationshipProfileToNode);

  return uiModelState.semanticModels.map((model) => {
    const node = uiSemanticModelToNode(model);
    node.items = entitiesToNodes(uiModelState, children, model);
    if (model.modelType !== CmeSemanticModelType.ExternalSemanticModel) {
      node.addEntityAction = {
        action: ACTION_SEMANTIC_MODEL_CREATE_ASSOCIATION,
        title: "catalog.model.create-association",
      }
    }
    return node;
  });
};

const entitiesToNodes = (
  uiModelState: UiModelState,
  children: NodeChildren,
  semanticModel: UiSemanticModel,
): State.TreeNode[] => {
  return filterByModel(uiModelState.relationships, semanticModel)
    .filter(item => isComplexType(item.range.identifier))
    .map(item => uiRelationshipToNode(item))
    .map(item => addChildrenToNode(children, item, []));
}
