import { UiModelState } from "../ui-model";
import { uiSemanticModelToNode } from "../catalog-state-adapter";
import * as State from "../catalog-state";
import * as Toolbars from "../catalog-toolbar";
import { CatalogLayout } from "../catalog-layout";

export const modelsLayout: CatalogLayout = {
  identifier: "model",
  label: "model.vocabularies",
  layoutFactory: modelsLayoutFactory,
  toolbars: {
    [State.SEMANTIC_MODEL_NODE_TYPE]: Toolbars.SemanticModelToolbar,
  },
  showAddModel: true,
};

function modelsLayoutFactory(
  uiModelState: UiModelState,
): State.TreeNode[]  {
  return uiModelState.semanticModels.map((model) => {
    return uiSemanticModelToNode(model);
  });
};
