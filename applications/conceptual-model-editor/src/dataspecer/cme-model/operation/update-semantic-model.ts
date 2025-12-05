import { CmeSemanticModelChange, CmeSemanticModelNameLanguage } from "../model";
import { isInMemorySemanticModel, SemanticModel } from "../../semantic-model";

/**
 * @throws DataspecerError
 */
export function updateCmeSemanticModel(
  model: SemanticModel,
  next: CmeSemanticModelChange,
) {
  model.setAlias(next.name[CmeSemanticModelNameLanguage]);
  if (isInMemorySemanticModel(model)) {
    model.setBaseIri(next.baseIri ?? "");
  }
}
