import { UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { placePositionOnGrid } from "@dataspecer/layout";
import { Options, configuration } from "../application";
import { openCreateClassDialogAction } from "./open-create-class-dialog";
import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { ClassesContext } from "../context/classes-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Position } from "../diagram";
import { UseDiagramType } from "../diagram/diagram-hook";
import { ClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { firstInMemorySemanticModel } from "../utilities/model";
import { CmeReference } from "../dataspecer/cme-model/model";
import { CmeOperationExecutor } from "../operation";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { LabelResolver } from "../dependency-tracker";

export function openCreateClassDialogWithModelDerivedFromClassAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  options: Options,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  positionToPlaceClassOn: Position,
  onConfirmCallback: ((created: CmeReference, state: ClassDialogState) => void | Promise<void>) | null,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
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

  const model = firstInMemorySemanticModel(classes.semanticModels);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  placePositionOnGrid(
    positionToPlaceClassOn, configuration().xSnapGrid, configuration().ySnapGrid);
  openCreateClassDialogAction(
    executor, options, dialogs, classes, graph, notifications, visualModel,
    diagram, model, positionToPlaceClassOn, onConfirmCallback, tracker,
    labelResolver);
}
