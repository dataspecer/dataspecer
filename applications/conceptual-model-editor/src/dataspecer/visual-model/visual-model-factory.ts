import { EntityModel } from "@dataspecer/core-v2";
import { createDefaultVisualModelFactory, VisualModel, WritableVisualModel } from "@dataspecer/visual-model";
import { ColorPalette } from "../../util/color-utils";

const visualModelFactory = createDefaultVisualModelFactory();

/**
 * @param source Optional model to load visual information from.
 * @returns Visual model with model information from given model.
 */
export function createWritableVisualModel(source: VisualModel | null): WritableVisualModel {
  const result = visualModelFactory.createNewWritableVisualModelSync(null);
  if (source !== null) {
    copyModelsData(source, result);
  }
  return result;
}

function copyModelsData(source: VisualModel, target: WritableVisualModel): void {
  for (const [identifier, data] of source.getModelsData()) {
    if (data.color === null) {
      continue;
    }
    target.setModelColor(identifier, data.color);
  }
}

/**
 * @param semanticModels
 * @returns Default model with colors for all models.
 */
export function createDefaultWritableVisualModel(
  semanticModels: EntityModel[],
): WritableVisualModel {
  const result = visualModelFactory.createNewWritableVisualModelSync(null);
  result.setLabel({ "en":"Default" });
  const colors = Object.entries(ColorPalette)
    .map(([_, value]) => value[500]);
  let index = 0;
  for (const model of semanticModels) {
    result.setModelColor(model.getId(), colors[index % colors.length]);
    ++index;
  }
  return result;
}
