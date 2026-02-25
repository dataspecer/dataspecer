import { EntityModel } from "@dataspecer/core-v2";

import { createLogger } from "../application";
import { ModelGraphContextType } from "../context/model-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { createAddModelDialog } from "../dialog/semantic-model/create-semantic-model/create-semantic-model-dialog";
import {
  CreateModelState,
  TabType,
} from "../dialog/semantic-model/create-semantic-model/create-semantic-model-dialog-controller";
import { randomColorFromPalette } from "../util/color-utils";
import { createDefaultWritableVisualModel } from "../dataspecer/visual-model/visual-model-factory";
import {
  createCzechSemanticVocabulary,
  createInMemorySemanticModel,
  createRdfsSemanticModel,
} from "@/dataspecer/semantic-model/semantic-model-factory";

const LOG = createLogger(import.meta.url);

export function openCreateVocabularyAction(
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
) {
  const onConfirm = (state: CreateModelState) => {
    void (async () => {
      const models = await createSemanticModels(state);
      addModelsToGraph(graph, models);
      const aggregatedView = graph.aggregator.getView();
      graph.setAggregatorView(aggregatedView);
    })();
  };
  dialogs.openDialog(createAddModelDialog(onConfirm));
}

const SGOV_IDENTIFIER = "sgov";

export async function createSemanticModels(
  state: CreateModelState,
): Promise<EntityModel[]> {
  const result: EntityModel[] = [];
  switch (state.activeTab) {
  case TabType.AddFromUrl:
    result.push(await createRdfsSemanticModel(state.modelUrl, state.modelAlias));
    break;
  case TabType.AddPredefined:
    for (const model of state.selectedModels) {
      if (model.url !== undefined) {
        result.push(await createRdfsSemanticModel(
          model.url, model.alias ?? model.label));
      } else if (model.identifier === SGOV_IDENTIFIER) {
        result.push(await createCzechSemanticVocabulary());
      } else {
        LOG.error("Invalid predefined model.", { model });
      }
    }
    break;
  case TabType.CreateLocal:
    result.push(await createInMemorySemanticModel(state.modelAlias));
    break;
  }
  return result;
}

function addModelsToGraph(graph: ModelGraphContextType, models: EntityModel[]) {
  // If there is no visual model, we create a default one.
  if (graph.aggregatorView.getActiveVisualModel() === null) {
    LOG.warn("Creating default visual model.")
    const visualModel = createDefaultWritableVisualModel(models);
    graph.aggregatorView.changeActiveVisualModel(visualModel.getId());
  }

  for (const model of models) {
    graph.aggregator.addModel(model);
    graph.setModels((previous) => [...previous, model]);
    for (const [_, visualModel] of graph.visualModels) {
      visualModel.setModelColor(model.getId(), randomColorFromPalette());
    }
  }
}
