import React, { useContext, useMemo } from "react";

import {
  AggregatedEntityWrapper,
  SemanticModelAggregator,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";
import type { EntityModel } from "@dataspecer/core-v2/entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel, type WritableVisualModel } from "@dataspecer/visual-model";

import { randomColorFromPalette } from "../util/color-utils";
import { deleteEntityModel } from "../dataspecer/visual-model/operation/delete-entity-model";
import { createDefaultWritableVisualModel } from "../dataspecer/visual-model/visual-model-factory";
import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { QueryParamsContextType } from "./query-params-context";

const _semanticModelAggregator = new SemanticModelAggregator();

type SemanticModelAggregatorType = typeof _semanticModelAggregator;

interface ModelGraphContext {

  aggregatorView: SemanticModelAggregatorView;

  models: Map<string, EntityModel>;

  visualModels: Map<string, WritableVisualModel>;

  visualModelsList: WritableVisualModel[];

  // Actions

  reloadView(): void;

  selectActiveVisualModel(identifier: ModelDsIdentifier | null): void;

  addSemanticModel(model: EntityModel): void;

  addVisualModel(model: VisualModel): void;

  deleteModel: (model: ModelDsIdentifier) => void;

  deleteVisualModel: (model: ModelDsIdentifier) => void;

};

const ModelGraphContext = React.createContext(null as any);

export function ModelContextProvider(props: {
  aggregator: SemanticModelAggregatorType,
  aggregatorView: SemanticModelAggregatorView,
  setAggregatorView: (value: SemanticModelAggregatorView) => void,
  models: EntityModel[],
  setModels: (setter: (models: EntityModel[]) => EntityModel[]) => void,
  visualModels: WritableVisualModel[],
  setVisualModels: (setter: (models: WritableVisualModel[]) => WritableVisualModel[]) => void,
  queryParamsContext: QueryParamsContextType,
  children: React.ReactNode,
}) {
  const { aggregator, aggregatorView, setAggregatorView,
    models, setModels, visualModels, setVisualModels,
    queryParamsContext } = props;

  // State propagation.

  const modelMap = useMemo(() => new Map(models.map(
    (model) => [model.getId(), model])), [models]);

  const visualModelMap = useMemo(() => new Map(visualModels.map(
    (model) => [model.getIdentifier(), model])),
    [visualModels]);

  //

  const context = useMemo(() => {
    return {
      aggregatorView,
      models: modelMap,
      visualModels: visualModelMap,
      visualModelsList: visualModels,
      reloadView: function (): void {
        setAggregatorView(aggregator.getView());
      },
      selectActiveVisualModel: function (identifier: ModelDsIdentifier | null): void {
        aggregatorView.changeActiveVisualModel(identifier);
        setAggregatorView(aggregator.getView());
        queryParamsContext.updateViewId(identifier);
      },
      addSemanticModel: function (model: EntityModel): void {
        aggregator.addModel(model);
        setModels(prev => [...prev, model]);
      },
      addVisualModel: function (model: WritableVisualModel): void {
        aggregator.addModel(model);
        setVisualModels(prev => [...prev, model]);
      },
      deleteModel: (identifier: ModelDsIdentifier) => {
        const model = modelMap.get(identifier);
        if (model === undefined) {
          return;
        }
        aggregator.deleteModel(model);
        setModels(prev => prev.filter(item => item !== model));
      },
      deleteVisualModel: (identifier: ModelDsIdentifier) => {
        const model = visualModelMap.get(identifier);
        if (model === undefined) {
          return;
        }
        aggregator.deleteModel(model);
        setVisualModels(prev => prev.filter(item => item !== model));
      },
    } satisfies ModelGraphContext;
  }, [
    aggregator, aggregatorView, setAggregatorView,
    modelMap, setModels, visualModelMap, setVisualModels,
    queryParamsContext,
  ]);

  return React.createElement(
    ModelGraphContext.Provider, { value: context }, props.children)
}

/**
 * Provides all models and visual models we work with
 * also provides model manipulating functions (eg add, remove, set alias, ..)
 */
export const useModelGraphContext = (): UseModelGraphContextType => {
  const context = useContext(ModelGraphContext);
  return useMemo(() => modelGraphContextToUse(context), [context]);
};

export function modelGraphContextToUse(context: ModelGraphContext): UseModelGraphContextType {
  const { aggregatorView, models, visualModels, visualModelsList } = context;

  const addModel = (...models: EntityModel[]) => {
    // Make sure there is a view model.
    if (aggregatorView.getActiveVisualModel() === null) {
      console.warn("Creating default visual model.")
      const visualModel = createDefaultWritableVisualModel(models);
      addVisualModel(visualModel);
      aggregatorView.changeActiveVisualModel(visualModel.getId());
    }

    // Add models.
    for (const model of models) {
      context.addSemanticModel(model);
      // Set color for all visual models.
      for (const [_, visualModel] of visualModels) {
        visualModel.setModelColor(model.getId(), randomColorFromPalette());
      }
    }
  };

  const addVisualModel = (...models: WritableVisualModel[]) => {
    for (const model of models) {
      context.addVisualModel(model);
    }
  };

  const setModelAlias = (alias: string | null, model: EntityModel) => {
    // TODO We need propagate change in models.
    model.setAlias(alias);
  };

  const setModelIri = (iri: string, model: InMemorySemanticModel) => {
    // TODO We need propagate change in models.
    model.setBaseIri(iri);
  };

  const replaceModels = (nextModels: EntityModel[], nextVisualModels: WritableVisualModel[]) => {
    // Remove old models.
    models.keys().forEach(item => context.deleteModel(item));
    visualModels.keys().forEach(item => context.deleteVisualModel(item));
    // Set new models.
    nextModels.forEach(item => context.addSemanticModel(item));
    nextVisualModels.forEach(item => context.addVisualModel(item));
  };

  const deleteModel = (modelId: string) => {
    // We need to remove all records about this model.
    visualModels.forEach(visualModel => deleteEntityModel(visualModel, modelId));
    // Now we can remove this from the package.
    context.deleteModel(modelId);
  };

  const deleteVisualModel = (modelId: string) => {
    context.deleteVisualModel(modelId);
    context.reloadView();
  };

  return {
    semanticModels: models,
    visualModels,
    visualModelsList,
    //
    getActiveViewId() {
      return aggregatorView.getActiveViewId();
    },
    getActiveVisualModel() {
      return aggregatorView.getActiveVisualModel();
    },
    getEntities() {
      return aggregatorView.getEntities();
    },
    reloadView: () => context.reloadView(),
    selectActiveVisualModel: (model) => context.selectActiveVisualModel(model),
    addSemanticModel: addModel,
    addVisualModel,
    setModelAlias,
    setModelIri,
    replaceModels,
    deleteModel,
    deleteVisualModel,
    onVisualModelDidChange: () => {
      const activeViewId = aggregatorView.getActiveViewId();
      aggregatorView.changeActiveVisualModel(activeViewId ?? null);
      context.reloadView();
    },
    subscribeToChanges(callback) {
      return aggregatorView.subscribeToChanges(callback);
    },
  };
}

export interface UseModelGraphContextType {

  semanticModels: Map<string, EntityModel>;

  visualModels: Map<string, WritableVisualModel>;

  visualModelsList: WritableVisualModel[];

  //

  getActiveViewId(): string | undefined;

  getEntities(): Record<string, AggregatedEntityWrapper>;

  reloadView: () => void;

  getActiveVisualModel(): VisualModel | null;

  selectActiveVisualModel(identifier: ModelDsIdentifier | null): void;

  addSemanticModel: (...models: EntityModel[]) => void;

  addVisualModel: (...models: WritableVisualModel[]) => void;

  setModelAlias: (alias: string | null, model: EntityModel) => void;

  setModelIri: (iri: string, model: InMemorySemanticModel) => void;

  replaceModels: (semanticModels: EntityModel[], visualModels: WritableVisualModel[]) => void;

  deleteModel: (modelId: string) => void;

  deleteVisualModel: (modelId: string) => void;

  subscribeToChanges(callback: (updated: AggregatedEntityWrapper[], removed: string[]) => void): () => void;

  onVisualModelDidChange: () => void;

}
