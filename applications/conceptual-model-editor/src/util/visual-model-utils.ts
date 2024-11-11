import { type WritableVisualModel, createDefaultVisualModelFactory } from "@dataspecer/core-v2/visual-model";

const visualModelFactory = createDefaultVisualModelFactory();

export function createWritableVisualModel() : WritableVisualModel {
  return visualModelFactory.createNewWritableVisualModelSync();
}
