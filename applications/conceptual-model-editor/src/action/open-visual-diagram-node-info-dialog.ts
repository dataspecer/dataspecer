import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { VisualModelDiagramNode } from "@/diagram";
import { VisualModel } from "@dataspecer/visual-model";
import { ModelGraphContextType } from "@/context/model-context";
import { prepareDataForVisualDiagramNodeDialog } from "./open-edit-visual-diagram-node-dialog";
import {
  createVisualDiagramNodeInfoDialog
} from "../dialog/visual-model/visual-diagram-node/show-info-about-visual-diagram-node/create-visual-diagram-node-info-dialog";

/**
 * Open dialog containing info about {@link visualDiagramNode}.
 */
export function openVisualDiagramNodeInfoDialogAction(
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel,
  visualModelDiagramNode: VisualModelDiagramNode,
) {
  const data = prepareDataForVisualDiagramNodeDialog(
    notifications, options, graph, visualModel, visualModelDiagramNode);

  if (data === null) {
    return;
  }

  dialogs.openDialog(createVisualDiagramNodeInfoDialog(data.state, null));
}
