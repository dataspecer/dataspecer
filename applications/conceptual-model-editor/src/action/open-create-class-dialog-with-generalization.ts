import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { openCreateClassDialogWithModelDerivedFromClassAction } from "./open-create-class-dialog-with-derived-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { UseModelGraphContextType } from "../context/model-context";
import { ClassesContext } from "../context/classes-context";
import { Options } from "../application";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseDiagramType } from "../diagram/diagram-hook";
import { Position } from "../diagram";
import { addSemanticGeneralizationToVisualModelAction } from "./add-generalization-to-visual-model";
import { CmeOperationExecutor, cmeOperations } from "../operation";
import { reportFailure } from "./utilities/report-failure";
import { CmeReference } from "../dataspecer/cme-model/model";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { LabelResolver } from "../dependency-tracker";

/**
 * Opens dialog which on confirm creates class,
 * which is connected to node ({@link nodeIdentifier}) by generalization.
 * Direction is decided by {@link isCreatedClassTarget}
 */
export function openCreateClassDialogAndCreateGeneralizationAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  options: Options,
  graph: UseModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  isCreatedClassParent: boolean,
  positionToPlaceClassOn: Position,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const onConfirm = (createdClassData: CmeReference) =>
    createGeneralizationToCreatedClass(
      executor, notifications, graph,
      visualModel, nodeIdentifier, isCreatedClassParent, createdClassData);

  openCreateClassDialogWithModelDerivedFromClassAction(
    executor, notifications, graph, dialogs, classes, options,
    diagram, visualModel, nodeIdentifier, positionToPlaceClassOn, onConfirm,
    tracker, labelResolver);
}

async function createGeneralizationToCreatedClass(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
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

  const args = cmeOperations.createSemanticGeneralization.create(executor.createContext, {
    semanticModel: createdClassData.model,
    iri: null,
    child: isCreatedClassParent ? sourceClassIdentifier : createdClassData.identifier,
    parent: isCreatedClassParent ? createdClassData.identifier : sourceClassIdentifier,
  });
  const outcome = await executor.execute(args);
  if (reportFailure(notifications, outcome, "Can not create the generalization.")) {
    return;
  }
  const result = { identifier: args.identifier, model: createdClassData.model };

  await addSemanticGeneralizationToVisualModelAction(
    notifications, graph, visualModel, result.identifier, result.model);
}
