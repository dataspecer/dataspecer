import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { openCreateClassDialogWithModelDerivedFromClassAction } from "./open-create-class-dialog-with-derived-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContextType } from "../context/model-context";
import { ClassesContextType } from "../context/classes-context";
import { Options } from "../application";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseDiagramType } from "../diagram/diagram-hook";
import { Position } from "../diagram";
import { addSemanticGeneralizationToVisualModelAction } from "./add-generalization-to-visual-model";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { CmeReference } from "../dataspecer/cme-model/model";

/**
 * Opens dialog which on confirm creates class,
 * which is connected to node ({@link nodeIdentifier}) by generalization.
 * Direction is decided by {@link isCreatedClassTarget}
 */
export function openCreateClassDialogAndCreateGeneralizationAction(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  options: Options,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  isCreatedClassParent: boolean,
  positionToPlaceClassOn: Position,
) {
  const onConfirm = (createdClassData: CmeReference) => {
    createGeneralizationToCreatedClass(
      cmeExecutor, notifications, graph,
      visualModel, nodeIdentifier, isCreatedClassParent, createdClassData);
  }

  openCreateClassDialogWithModelDerivedFromClassAction(
    cmeExecutor, notifications, graph, dialogs, classes, options,
    diagram, visualModel, nodeIdentifier, positionToPlaceClassOn, onConfirm);
}

function createGeneralizationToCreatedClass(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  isCreatedClassParent: boolean,
  createdClassData: CmeReference,
) {
  const node = visualModel.getVisualEntity(nodeIdentifier);
  if (node === null) {
    notifications.error("Source node of the drag event is not in visual model");
    return;
  }
  if (!isVisualNode(node)) {
    notifications.error("Source node of the drag event is not a node");
    return;
  }
  const sourceClassIdentifier = node.representedEntity;

  const result = cmeExecutor.createGeneralization({
    model: createdClassData.model,
    iri: null,
    childIdentifier: isCreatedClassParent ? sourceClassIdentifier : createdClassData.identifier,
    parentIdentifier: isCreatedClassParent ? createdClassData.identifier : sourceClassIdentifier,
  });

  addSemanticGeneralizationToVisualModelAction(
    notifications, graph, visualModel, result.identifier, result.model);
}
