import { QueryParamsContextType } from "../context/query-params-context";
import { UseModelGraphContextType } from "../context/model-context";

/**
 * Changes visual model to the {@link viewIdentifier} and updates url.
 */
export function changeVisualModelAction (
  graph: UseModelGraphContextType,
  queryParamsContext: QueryParamsContextType,
  viewIdentifier: string | null
) {
  graph.selectActiveVisualModel(viewIdentifier);
  queryParamsContext.updateViewId(viewIdentifier);
};
