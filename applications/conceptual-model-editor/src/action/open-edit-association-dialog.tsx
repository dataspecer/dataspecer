import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  AssociationDialogState,
  createEditAssociationDialogState,
} from "../dialog/association/edit-association-dialog-state";
import { DialogSemanticTracker } from "../dialog/dialog-semantic-tracker";
import { createEditAssociationDialog } from "../dialog/association/edit-association-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  associationDialogStateToNewCmeRelationship,
} from "../dialog/association/edit-association-dialog-state-adapter";
import { LabelResolver } from "../dependency-tracker";

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const initialState = createEditAssociationDialogState(
    visualModel, options.language, model, entity, graph.models, tracker,
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
