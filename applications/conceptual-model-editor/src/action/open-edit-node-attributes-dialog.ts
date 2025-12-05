import { WritableVisualModel } from "@dataspecer/visual-model";
import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createEditVisualNodeDialog } from "../dialog/visual-model/visual-node/edit-visual-node-dialog";
import { Options } from "../application";
import {
  createEditVisualNodeState,
  EditVisualNodeDialogState,
} from "../dialog/visual-model/visual-node/edit-visual-node-dialog-state";
import { ModelGraphContextType } from "../context/model-context";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getEntityLabelToShowInDiagram } from "@/util/utils";

export function openEditNodeAttributesDialogAction(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  dialogs: DialogApiContextType,
  _notifications: UseNotificationServiceWriterType,
  options: Options,
  visualModel: WritableVisualModel,
  visualNodeIdentifier: string,
) {
  const initialState = createEditVisualNodeState(
    graphContext, visualModel, visualNodeIdentifier,
    options.language);

  const onConfirm = (state: EditVisualNodeDialogState) => {
    visualModel.updateVisualEntity(visualNodeIdentifier, {
      content: state.activeContent.map(item => item.identifier)
    });
  };

  const name = getNodeName(classesContext, initialState);
  dialogs.openDialog(createEditVisualNodeDialog(initialState, name, onConfirm));
}

const getNodeName = (
  classesContext: ClassesContextType,
  state: EditVisualNodeDialogState
) => {
  const entities = (classesContext.classes as (SemanticModelClass | SemanticModelClassProfile)[])
    .concat(classesContext.classProfiles);
  const entity = entities.find(entity => entity.id === state.representedEntity.identifier);
  if (entity === undefined) {
    return "Unknown entity";
  }

  return getEntityLabelToShowInDiagram(state.language, entity);
}