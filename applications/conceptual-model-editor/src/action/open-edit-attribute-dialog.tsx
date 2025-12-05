import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { AttributeDialogState, createEditAttributeDialogState } from "../dialog/attribute/edit-attribute-dialog-state";
import { createEditAttributeDialog } from "../dialog/attribute/edit-attribute-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { attributeDialogStateToNewCmeRelationship } from "../dialog/attribute/edit-attribute-dialog-state-adapter";

/**
 * Open and handle edit Attribute dialog.
 */
export function openEditAttributeDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
) {
  const initialState = createEditAttributeDialogState(
    classes, graph, visualModel, options.language, model, entity);

  const onConfirm = (state: AttributeDialogState) => {
    cmeExecutor.updateRelationship({
      identifier: entity.id,
      ...attributeDialogStateToNewCmeRelationship(state),
    });
    cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);
  };

  dialogs.openDialog(createEditAttributeDialog(initialState, onConfirm));
}
