import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { ClassDialogState, createEditClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { DialogSemanticTracker } from "../dialog/dialog-semantic-tracker";
import { createEditClassDialog } from "../dialog/class/edit-class-dialog";
import { classDialogStateToNewCmeClass } from "../dialog/class/edit-class-dialog-state-adapter";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { createVisualModelOperationExecutor } from "../dataspecer/visual-model/visual-model-operation-executor";
import { LabelResolver } from "../dependency-tracker";

export function openEditClassDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClass,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const initialState = createEditClassDialogState(
    visualModel, options.language, model, entity, graph.models, tracker,
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
  };

  dialogs.openDialog(createEditClassDialog(initialState, onConfirm));
}
