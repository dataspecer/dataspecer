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
  };

  const state = createEditVisualModelDialogState(
    options.language, visualModel.getLabel());
  dialogs?.openDialog(editVisualModelDialog(state, onConfirm));
}
