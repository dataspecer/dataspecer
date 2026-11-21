import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { EntityModel } from "@dataspecer/core-v2";
import { SemanticModelAggregator } from "@dataspecer/core-v2/semantic-model/aggregator";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createDefaultVisualModelFactory, WritableVisualModel } from "@dataspecer/visual-model";

import {
  ModelContextProvider,
  useModelGraphContext,
  UseModelGraphContextType,
} from "./model-context";
import { cmeOperations } from "../operation";
import { MissingModel } from "../operation/operation";

describe("ModelContextProvider", () => {

  test("Executor sees a model added through the context right away.", async () => {
    const visualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
    const graph = renderModelGraphContext([], [visualModel]);
    const model = new InMemorySemanticModel();

    expect((await createClassIn(graph, model)).exception).toBeInstanceOf(MissingModel);
    graph.addSemanticModel(model);
    const result = await createClassIn(graph, model);

    expect(result.exception).toBeUndefined();
    if (result.exception === undefined) {
      expect(model.getEntities()[result.created]).toBeDefined();
    }
  });

  test("Executor does not see a model deleted through the context.", async () => {
    const visualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
    const model = new InMemorySemanticModel();
    const graph = renderModelGraphContext([model], [visualModel]);

    expect((await createClassIn(graph, model)).exception).toBeUndefined();
    graph.deleteModel(model.getId());

    expect((await createClassIn(graph, model)).exception).toBeInstanceOf(MissingModel);
  });

  test("Executor sees a visual model added through the context right away.", async () => {
    const visualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
    const graph = renderModelGraphContext([], [visualModel]);
    const added = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
    const executor = graph.executor();

    graph.addVisualModel(added);
    const result = await executor.execute(
      cmeOperations.updateVisualModelLabel.create(executor.createContext, {
        visualModel: added.getIdentifier(),
        label: { en: "Added" },
      }));

    expect(result.exception).toBeUndefined();
    expect(added.getLabel()).toEqual({ en: "Added" });
  });

});

/**
 * Render the provider once and return the context its children see.
 * The state setters do nothing, as if React did not re-render yet.
 */
function renderModelGraphContext(
  models: EntityModel[], visualModels: WritableVisualModel[],
): UseModelGraphContextType {
  const aggregator = new SemanticModelAggregator();
  [...models, ...visualModels].forEach(model => aggregator.addModel(model));
  const aggregatorView = aggregator.getView();
  aggregatorView.changeActiveVisualModel(visualModels[0]?.getIdentifier() ?? null);
  let result: UseModelGraphContextType | null = null;
  const Consumer = () => {
    result = useModelGraphContext();
    return null;
  };
  renderToString(createElement(ModelContextProvider, {
    aggregator,
    aggregatorView,
    setAggregatorView: () => { },
    models,
    setModels: () => { },
    visualModels,
    setVisualModels: () => { },
    queryParamsContext: {
      packageId: null,
      viewId: null,
      updatePackageId: () => { },
      updateViewId: () => { },
    },
    children: createElement(Consumer),
  }));
  if (result === null) {
    throw new Error("Context was not rendered.");
  }
  return result;
}

const createClassIn = (graph: UseModelGraphContextType, model: EntityModel) =>
  graph.executor().execute(cmeOperations.createSemanticClass.create(
    graph.executor().createContext, {
    semanticModel: model.getId(),
    iri: "a",
    name: null,
    description: null,
    externalDocumentationUrl: null,
  }));
