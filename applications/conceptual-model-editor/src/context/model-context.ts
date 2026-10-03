import React, { useContext, useMemo, useState } from "react";

import {
  SemanticModelAggregator,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";
import type { EntityModel } from "@dataspecer/core-v2/entity-model";
import type { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
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

  // Actions

  reloadView(): void;

  selectVisualModel(identifier: ModelDsIdentifier | null): void;

  addSemanticModel(model: EntityModel): void;

  addVisualModel(model: VisualModel): void;

  deleteModel: (model: EntityModel) => void;

  deleteVisualModel: (model: VisualModel) => void;

};

export const ModelGraphContext = React.createContext(null as unknown as ModelGraphContext);

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
      reloadView: function (): void {
        setAggregatorView(aggregator.getView());
      },
      selectVisualModel: function (identifier: ModelDsIdentifier | null): void {
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
      // setModels,
      // setVisualModels,
      deleteModel: (model: EntityModel) => {
        aggregator.deleteModel(model);
        setModels(prev => prev.filter(item => item !== model));
      },
      deleteVisualModel: (model: VisualModel) => {
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
  const { aggregatorView, models, visualModels } = context;

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

  const replaceModels = (entityModels: EntityModel[], visualModels: WritableVisualModel[]) => {
    // Remove old models.
    for (const [_, model] of models) {
      context.deleteModel(model);
    }
    for (const model of visualModels) {
      context.deleteVisualModel(model);
    }
    // Set new models.
    for (const model of visualModels) {
      context.addVisualModel(model);
    }
    for (const model of entityModels) {
      context.addSemanticModel(model);
    }
  };

  const removeModel = (modelId: string) => {
    const model = models.get(modelId);
    if (!model) {
      console.error(`No model with id: ${modelId} found.`);
      return;
    }
    // Start be removing all from the visual models.
    visualModels.forEach(visualModel => deleteEntityModel(
      visualModel, model.getId()));
    // Now we can remove this from the package.
    context.deleteModel(model);
  };

  const removeVisualModel = (modelId: string) => {
    const visualModel = visualModels.get(modelId);
    if (!visualModel) {
      console.error(`No model with id: ${modelId} found`);
      return;
    }
    context.deleteVisualModel(visualModel);
    context.reloadView();
  };

  return {
    aggregatorView,
    models,
    visualModels,
    //
    addModel,
    addVisualModel,
    setModelAlias,
    setModelIri,
    replaceModels,
    removeModel,
    removeVisualModel,
  };
}

export interface UseModelGraphContextType {

  // aggregator: typeof _semanticModelAggregator;

  aggregatorView: SemanticModelAggregatorView;

  // setAggregatorView: (next: SemanticModelAggregatorView) => void;

  models: Map<string, EntityModel>;

  visualModels: Map<string, WritableVisualModel>;

  //

  addModel: (...models: EntityModel[]) => void;

  addVisualModel: (...models: WritableVisualModel[]) => void;

  setModelAlias: (alias: string | null, model: EntityModel) => void;

  setModelIri: (iri: string, model: InMemorySemanticModel) => void;

  replaceModels: (entityModels: EntityModel[], visualModels: WritableVisualModel[]) => void;

  removeModel: (modelId: string) => void;

  removeVisualModel: (modelId: string) => void;

}

export type ModelGraphContextType = ModelGraphContext;
