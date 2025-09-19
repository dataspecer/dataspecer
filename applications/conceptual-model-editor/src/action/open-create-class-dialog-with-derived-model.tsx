import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { placePositionOnGrid } from "@dataspecer/layout";
import { Options, configuration } from "../application";
import { openCreateClassDialogAction } from "./open-create-class-dialog";
import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { ClassesContextType } from "../context/classes-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Position } from "../diagram";
import { UseDiagramType } from "../diagram/diagram-hook";
import { ClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { firstInMemorySemanticModel } from "../utilities/model";
import { CmeReference } from "../dataspecer/cme-model/model";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";

export function openCreateClassDialogWithModelDerivedFromClassAction(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  options: Options,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  positionToPlaceClassOn: Position,
  onConfirmCallback: ((created: CmeReference, state: ClassDialogState) => void) | null,
) {
  const node = visualModel.getVisualEntity(nodeIdentifier);
  if(node === null) {
    notifications.error("Given node to create class from could not be found.");
    return;
  }

  if(!isVisualNode(node)) {
    notifications.error("Given node to create class from could is not a node.");
    return;
  }

  const model = firstInMemorySemanticModel(graph.models);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  placePositionOnGrid(
    positionToPlaceClassOn, configuration().xSnapGrid, configuration().ySnapGrid);
  openCreateClassDialogAction(
    cmeExecutor, options, dialogs, classes, graph, notifications, visualModel,
    diagram, model, positionToPlaceClassOn, onConfirmCallback);
}
