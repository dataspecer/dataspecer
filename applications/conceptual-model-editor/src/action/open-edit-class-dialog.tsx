import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { Options } from "../application";
import { ClassDialogState, createEditClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditClassDialog } from "../dialog/class/edit-class-dialog";
import { classDialogStateToNewCmeClass } from "../dialog/class/edit-class-dialog-state-adapter";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { createVisualModelOperationExecutor } from "../dataspecer/visual-model/visual-model-operation-executor";
import { LabelResolver } from "../dependency-tracker";
import { applyVisualColorFromDialog } from "./utilities/visual-color-utilities";

export function openEditClassDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClass,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const initialState = createEditClassDialogState(
    visualModel, options.language, model, entity, classes.semanticModels, tracker,
    labelResolver);

  const onConfirm = (state: ClassDialogState) => {
    cmeExecutor.updateClass({
      identifier: entity.id,
      ...classDialogStateToNewCmeClass(state),
    });

    const { created, removed } = cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);

    if (isWritableVisualModel(visualModel)) {
      const visualExecutor = createVisualModelOperationExecutor(visualModel);
      removed.forEach(item => visualExecutor.deleteEntity(item));
      created.forEach(item => {
        visualExecutor.addGeneralization(
          item, item.childIdentifier, item.parentIdentifier);
      });
    }

    applyVisualColorFromDialog(
      classes, visualModel, entity.id, initialState, state);
  };

  dialogs.openDialog(createEditClassDialog(initialState, onConfirm));
}
