import { WritableVisualModel } from "@dataspecer/visual-model";
import { ModelGraphContextType, UseModelGraphContextType } from "../context/model-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createNewVisualModelAction } from "./create-new-visual-model-from-source-visual-model";
import { QueryParamsContextType } from "@/context/query-params-context";
import { createVisualModelDialog } from "@/dialog/visual-model/create-visual-model/edit-visual-model-dialog";
import { changeVisualModelAction } from "./change-visual-model";
import {
  createEditVisualModelDialogState,
  EditVisualModelDialogState,
} from "../dialog/visual-model/create-visual-model";

/**
 * Opens dialog, which on confirm creates visual model, which will contain all the {@link nodes} and {@link edges}.
 * Note that only the edges going between the list of nodes will be in the created visual model.
 * @param shouldSwitchToCreatedModel if set to true then the view is changed to the created visual model.
 */
export function openCreateVisualModelDialogAction(
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  useGraph: UseModelGraphContextType,
  queryParamsContext: QueryParamsContextType,
  visualModel: WritableVisualModel,
  nodes: string[],
  edges: string[],
  shouldSwitchToCreatedModel: boolean,
) {

  const onConfirm = (nextState: EditVisualModelDialogState) => {
    const createdVisualModel = createNewVisualModelAction(
      notifications, graph, useGraph, visualModel, nextState.label, nodes, edges);
    if (shouldSwitchToCreatedModel) {
      if (createdVisualModel === null) {
        return;
      }
      changeVisualModelAction(
        graph, queryParamsContext,
        createdVisualModel.getIdentifier());
    }
  };

  const state = createEditVisualModelDialogState(options.language, null);
  dialogs?.openDialog(createVisualModelDialog(state, onConfirm));
}
