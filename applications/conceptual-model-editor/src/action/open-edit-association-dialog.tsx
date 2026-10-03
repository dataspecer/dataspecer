import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { UseModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  AssociationDialogState,
  createEditAssociationDialogState,
} from "../dialog/association/edit-association-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditAssociationDialog } from "../dialog/association/edit-association-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  associationDialogStateToNewCmeRelationship,
} from "../dialog/association/edit-association-dialog-state-adapter";
import { LabelResolver } from "../dependency-tracker";
import { ClassesContext } from "../context/classes-context";

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const initialState = createEditAssociationDialogState(
    visualModel, options.language, model, entity, classes.semanticModels, tracker,
    labelResolver);

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
