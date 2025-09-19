import { EntityModel } from "@dataspecer/core-v2";
import { CmeSemanticModel, CmeSemanticModelType } from "./model/cme-semantic-model";
import { VisualModel } from "@dataspecer/visual-model";
import { semanticModelMapToCmeSemanticModel } from "./adapter";
import { configuration, t } from "../../application";

export function findAnyWritableModelFromRawInput(
  models: Map<string, EntityModel>,
  visualModel: VisualModel | null,
): CmeSemanticModel | null {
  const cmeModels = semanticModelMapToCmeSemanticModel(
    models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));
  const writableSemanticModel = findAnyWritableModel(cmeModels);
  return writableSemanticModel;
}

export function filterWritableModels(
  items: CmeSemanticModel[],
): CmeSemanticModel[] {
  return items.filter(isModelWritable);
}

export function findAnyWritableModel(
  items: CmeSemanticModel[],
): CmeSemanticModel | null {
  return items.find(isModelWritable) ?? null;
}

/**
 * @returns True if we can write the given vocabulary.
 */
function isModelWritable(item: CmeSemanticModel): boolean {
  return item.modelType === CmeSemanticModelType.InMemorySemanticModel;
}
