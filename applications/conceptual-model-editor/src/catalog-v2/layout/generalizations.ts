import { UiModelState, UiSemanticModel } from "../ui-model";
import {
  uiGeneralizationToNode,
  uiSemanticModelToNode,
} from "../catalog-state-adapter";
import { CatalogLayout } from "../catalog-layout";
import * as State from "../catalog-state";
import * as Toolbars from "../catalog-toolbar";
import { filterByModel } from "./layout-utilities";

/**
 * - model
 *  - generalization
 *  - generalization
 * - model
 *  - generalization
 *  - generalization
 */
export const generalizationsLayout: CatalogLayout = {
  identifier: "generalization",
  label: "model.generalizations",
  layoutFactory: generalizationLayoutFactory,
  toolbars: {
    [State.SEMANTIC_MODEL_NODE_TYPE]: Toolbars.SemanticModelGroupToolbar,
    [State.GENERALIZATION_NODE_TYPE]: Toolbars.GeneralizationToolbar,
  },
};

function generalizationLayoutFactory(
  uiModelState: UiModelState,
): State.TreeNode[] {
  return uiModelState.semanticModels.map((model) => {
    const node = uiSemanticModelToNode(model);
    node.items = entitiesToNodes(uiModelState, model);
    return node;
  });
};

const entitiesToNodes = (
  uiModelState: UiModelState,
  semanticModel: UiSemanticModel,
): State.TreeNode[] => {
  return filterByModel(uiModelState.generalizations, semanticModel)
    .map(item => uiGeneralizationToNode(item));
}
