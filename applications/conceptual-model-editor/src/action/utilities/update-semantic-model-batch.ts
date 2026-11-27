import { VisualModel } from "@dataspecer/visual-model";

import { CmeSemanticModelType } from "../../dataspecer/cme-model";
import { EditSemanticModelDialogState } from "../../dialog/semantic-model/edit-semantic-model";
import { CmeOperationBatchBuilder, cmeOperations } from "../../operation";
import { CmeCreateContext, CmeOperationArguments } from "../../operation/operation";

/**
 * Batch to apply the edit semantic model dialog.
 * The color is set in the given visual model, the alias and base IRI
 * only for an in-memory semantic model, as other models are read-only.
 *
 * @param visualModel Writable visual model to set the color in, or null.
 */
export function createUpdateSemanticModelBatch(
  createContext: CmeCreateContext,
  visualModel: VisualModel | null,
  state: EditSemanticModelDialogState,
) {
  let builder: CmeOperationBatchBuilder<CmeOperationArguments[]> =
    new CmeOperationBatchBuilder(createContext);
  if (visualModel !== null) {
    builder = builder.add(cmeOperations.setModelColor, {
      visualModel: visualModel.getIdentifier(),
      model: state.identifier,
      color: state.color,
    });
  }
  if (state.modelType === CmeSemanticModelType.InMemorySemanticModel) {
    builder = builder.add(cmeOperations.updateSemanticModel, {
      semanticModel: state.identifier,
      alias: state.label,
      baseIri: state.baseIri,
    });
  }
  return builder.build();
}
