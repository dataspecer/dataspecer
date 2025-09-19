import { WritableVisualModel } from "@dataspecer/visual-model";
import { CmeReference } from "../../cme-model";

export function deleteVisualEntity(
  visualModel: WritableVisualModel,
  generalization: CmeReference,
) {
  const entityVisuals = visualModel.getVisualEntitiesForRepresented(
    generalization.identifier);
  for (const entity of entityVisuals) {
    visualModel.deleteVisualEntity(entity.identifier);
  }
}
