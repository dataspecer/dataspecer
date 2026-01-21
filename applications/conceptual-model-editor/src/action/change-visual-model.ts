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
  graph.aggregatorView.changeActiveVisualModel(viewIdentifier);
  graph.setAggregatorView(graph.aggregator.getView());
  queryParamsContext.updateViewId(viewIdentifier ?? null);
};
