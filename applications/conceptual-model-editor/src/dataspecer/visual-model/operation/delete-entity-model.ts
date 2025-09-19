import { WritableVisualModel } from "@dataspecer/visual-model";
import { ModelDsIdentifier } from "../../entity-model";

export function deleteEntityModel(
  visualModel: WritableVisualModel,
  model: ModelDsIdentifier,
) {
  visualModel.deleteModelData(model);
}
