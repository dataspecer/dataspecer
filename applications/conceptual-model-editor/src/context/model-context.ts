import React, { useContext, useMemo } from "react";

import {
  SemanticModelAggregator,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";
import type { EntityModel } from "@dataspecer/core-v2/entity-model";
import type { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { type WritableVisualModel } from "@dataspecer/visual-model";

import { randomColorFromPalette } from "../util/color-utils";
import { deleteEntityModel } from "../dataspecer/visual-model/operation/delete-entity-model";
import { createDefaultWritableVisualModel } from "../dataspecer/visual-model/visual-model-factory";

// This is to compile with TypeScript as we can not use
// the type directly for aggregator.
const _SemanticModelAggregatorType = new SemanticModelAggregator();

export type ModelGraphContextType = {

  aggregator: typeof _SemanticModelAggregatorType;

  aggregatorView: SemanticModelAggregatorView;

  setAggregatorView: (next: SemanticModelAggregatorView) => void;

  models: Map<string, EntityModel>;

  setModels: React.Dispatch<React.SetStateAction<EntityModel[]>>;

  visualModels: Map<string, WritableVisualModel>;

  setVisualModels: React.Dispatch<React.SetStateAction<WritableVisualModel[]>>;
};

export const ModelGraphContext = React.createContext(null as unknown as ModelGraphContextType);

export interface UseModelGraphContextType {

  aggregator: typeof _SemanticModelAggregatorType;

  aggregatorView: SemanticModelAggregatorView;

  setAggregatorView: (next: SemanticModelAggregatorView) => void;

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

/**
 * Provides all models and visual models we work with
 * also provides model manipulating functions (eg add, remove, set alias, ..)
 */
export const useModelGraphContext = (): UseModelGraphContextType => {
  const context = useContext(ModelGraphContext);

  return useMemo(() => {
    const { aggregator, aggregatorView, models, visualModels } = context;

    const addModel = (...models: EntityModel[]) => {
      // Make sure there is a view model.
      if (aggregatorView.getActiveVisualModel() === null) {
        console.warn("Creating default visual model.")
        const visualModel = createDefaultWritableVisualModel(models);
        addVisualModel(visualModel);
        aggregatorView.changeActiveVisualModel(visualModel.getId());
      }

      // Add models.
      context.setModels((previous) => [...previous, ...models]);
      for (const model of models) {
        aggregator.addModel(model);
        // Set color for all visual models.
        for (const [_, visualModel] of visualModels) {
          visualModel.setModelColor(model.getId(), randomColorFromPalette());
        }
      }
    };

    const addVisualModel = (...models: WritableVisualModel[]) => {
      context.setVisualModels((previous) => [...previous, ...models]);
      for (const model of models) {
        aggregator.addModel(model);
      }
    };

    const setModelAlias = (alias: string | null, model: EntityModel) => {
      model.setAlias(alias);
      // We force update.
      context.setModels((previous) => [...previous]);
    };

    const setModelIri = (iri: string, model: InMemorySemanticModel) => {
      model.setBaseIri(iri);
      // We force update.
      context.setModels((previous) => [...previous]);
    };

    const replaceModels = (entityModels: EntityModel[], visualModels: WritableVisualModel[]) => {
      // Remove old models.
      for (const [_, model] of models) {
        aggregator.deleteModel(model);
      }
      for (const model of visualModels) {
        aggregator.deleteModel(model);
      }

      // Set new models.
      for (const model of visualModels) {
        aggregator.addModel(model);
      }
      for (const model of entityModels) {
        aggregator.addModel(model);
      }

      context.setModels([...entityModels]);
      context.setVisualModels([...visualModels]);
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
      aggregator.deleteModel(model);
      models.delete(modelId);
      context.setModels([...Object.values(models)]);
    };

    const removeVisualModel = (modelId: string) => {
      const visualModel = visualModels.get(modelId);
      if (!visualModel) {
        console.error(`No model with id: ${modelId} found`);
        return;
      }
      aggregator.deleteModel(visualModel);
      visualModels.delete(modelId);
      context.setVisualModels([...Object.values(visualModels)]);
      context.setAggregatorView(aggregator.getView());
    };

    return {
      aggregator,
      aggregatorView,
      setAggregatorView: context.setAggregatorView,
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
  }, [context]);
};
