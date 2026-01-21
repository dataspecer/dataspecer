import { WritableVisualModel } from "@dataspecer/visual-model";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../application";
import {
  editVisualModelDialog,
  createEditVisualModelDialogState,
  EditVisualModelDialogState,
} from "../dialog/visual-model/create-visual-model";

/**
 * Open dialog to edit visual model information.
 */
export function openEditVisualModelDialogAction(
  options: Options,
  dialogs: DialogApiContextType,
  visualModel: WritableVisualModel,
) {

  const onConfirm = (nextState: EditVisualModelDialogState) => {
    visualModel.setLabel(nextState.label);
    options.setVisualOptions({
      labelVisual: Number(nextState.labelVisual),
      entityMainColor: Number(nextState.entityMainColor),
      profileOfVisual: Number(nextState.profileOfVisual),
      profileOfColor: Number(nextState.profileOfColor),
      displayRangeDetail: nextState.displayRangeDetail,
      displayRelationshipProfileArchetype:
        nextState.displayRelationshipProfileArchetype,
    });
  };

  const state = createEditVisualModelDialogState(
    options.language, visualModel.getLabel(), options.visualOptions);
  dialogs?.openDialog(editVisualModelDialog(state, onConfirm));
}
