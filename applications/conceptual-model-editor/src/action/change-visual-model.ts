import { QueryParamsContextType } from "../context/query-params-context";
import { ModelGraphContextType } from "../context/model-context";

/**
 * Changes visual model to the {@link viewIdentifier} and updates url.
 */
export function changeVisualModelAction (
  graph: ModelGraphContextType,
  queryParamsContext: QueryParamsContextType,
  viewIdentifier: string | null
) {
  graph.selectVisualModel(viewIdentifier);
  queryParamsContext.updateViewId(viewIdentifier);
};
