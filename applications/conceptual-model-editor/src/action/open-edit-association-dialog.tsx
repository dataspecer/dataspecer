import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  AssociationDialogState,
  createEditAssociationDialogState,
} from "../dialog/association/edit-association-dialog-state";
import { createEditAssociationDialog } from "../dialog/association/edit-association-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  associationDialogStateToNewCmeRelationship,
} from "../dialog/association/edit-association-dialog-state-adapter";

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
) {
  const initialState = createEditAssociationDialogState(
    classes, graph, visualModel, options.language, model, entity);

  const onConfirm = (state: AssociationDialogState) => {
    cmeExecutor.updateRelationship({
      identifier: entity.id,
      ...associationDialogStateToNewCmeRelationship(state),
    });
    cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);
  };

  dialogs.openDialog(createEditAssociationDialog(initialState, onConfirm));
}
