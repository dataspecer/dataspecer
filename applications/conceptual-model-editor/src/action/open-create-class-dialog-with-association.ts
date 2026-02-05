import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { EntityRepresentative, findRepresentative, findVocabularyForModel } from "../dialog/utilities/dialog-utilities";
import { openCreateClassDialogWithModelDerivedFromClassAction } from "./open-create-class-dialog-with-derived-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContextType } from "../context/model-context";
import { ClassesContextType } from "../context/classes-context";
import { Options } from "../application";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseDiagramType } from "../diagram/diagram-hook";
import { Position } from "../diagram";
import { ClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { createNewAssociationDialogState } from "../dialog/association/edit-association-dialog-state";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  associationDialogStateToNewCmeRelationship,
} from "../dialog/association/edit-association-dialog-state-adapter";
import { CmeReference } from "../dataspecer/cme-model/model";
import { addSemanticRelationshipToVisualModelAction } from "./add-relationship-to-visual-model";
import { firstInMemorySemanticModel } from "../utilities/model";

/**
 * Opens dialog which on confirm creates class,
 * which is connected to node ({@link nodeIdentifier}) by association with default parameters.
 * Direction is decided by {@link isCreatedClassTarget}
 */
export function openCreateClassDialogAndCreateAssociationAction(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  options: Options,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  isCreatedClassTarget: boolean,
  positionToPlaceClassOn: Position,
) {
  const onConfirm = (created: CmeReference, state: ClassDialogState) => {
    createAssociationToCreatedClass(
      cmeExecutor, notifications, classes, options, graph, visualModel,
      nodeIdentifier, isCreatedClassTarget, created, state);
  }

  openCreateClassDialogWithModelDerivedFromClassAction(
    cmeExecutor, notifications, graph, dialogs, classes, options,
    diagram, visualModel, nodeIdentifier, positionToPlaceClassOn, onConfirm);
}

function createAssociationToCreatedClass(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  options: Options,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  isCreatedClassTarget: boolean,
  createdClassData: CmeReference,
  editClassDialogState: ClassDialogState
) {
  const model = firstInMemorySemanticModel(graph.models);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const state = createNewAssociationDialogState(
    classes, graph, visualModel, options.language, model.getId());

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

  const vocabularyForCreatedClass = findVocabularyForModel(
    graph, visualModel, createdClassData.model);
  const createdClassEntityRepresentative: EntityRepresentative = {
    identifier: createdClassData.identifier,
    iri: editClassDialogState.iri,
    model: vocabularyForCreatedClass?.identifier ?? "",
    name: editClassDialogState.name,
    label: editClassDialogState.name,
    description: editClassDialogState.description,
    profileOfIdentifiers: [],
    usageNote: null,
    isProfile: false
  };

  if (isCreatedClassTarget) {
    state.range = createdClassEntityRepresentative;

    const domain = findRepresentative(state.availableDomains, sourceClassIdentifier);
    if (domain === null) {
      notifications.error("Can not find the source class of the drag event in the representatives of domains");
      return;
    }
    state.domain = domain;
  }
  else {
    state.domain = createdClassEntityRepresentative;

    const range = findRepresentative(state.availableRanges, sourceClassIdentifier);
    if (range === null) {
      notifications.error("Can not find the source class of the drag event in the representatives of ranges");
      return;
    }
    state.range = range;
  }

  const result = cmeExecutor.createRelationship(
    associationDialogStateToNewCmeRelationship(state));
  cmeExecutor.updateSpecialization(result, state.model.identifier,
    [], state.specializations);

  addSemanticRelationshipToVisualModelAction(
    notifications, graph, visualModel, result.identifier, result.model);
}
