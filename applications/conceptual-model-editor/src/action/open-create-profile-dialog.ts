import {
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { WritableVisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../configuration/options";
import { ClassesContextType } from "../context/classes-context";
import { UseDiagramType } from "../diagram/diagram-hook";
import { addSemanticRelationshipProfileToVisualModelAction } from "./add-relationship-profile-to-visual-model";
import { addSemanticClassProfileToVisualModelAction } from "./add-class-profile-to-visual-model";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import {
  ClassProfileDialogState,
  createNewProfileClassDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import { createNewClassProfileDialog } from "../dialog/class-profile/edit-class-profile-dialog";
import {
  AttributeProfileDialogState,
  createNewAttributeProfileDialogState,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state";
import { createEditAttributeProfileDialog } from "../dialog/attribute-profile/edit-attribute-profile-dialog";
import {
  AssociationProfileDialogState,
  createNewAssociationProfileDialogState,
} from "../dialog/association-profile/edit-association-profile-dialog-state";
import { createNewAssociationProfileDialog } from "../dialog/association-profile/edit-association-profile-dialog";
import {
  classProfileDialogStateToNewCmeClassProfile,
} from "../dialog/class-profile/edit-class-profile-dialog-state-adapter";
import {
  attributeProfileDialogStateToNewCmeRelationshipProfile,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state-adapter";
import {
  associationProfileDialogStateToNewCmeRelationshipProfile,
} from "../dialog/association-profile/edit-association-profile-dialog-state-adapter";

export function openCreateProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  diagram: UseDiagramType,
  position: { x: number, y: number },
  identifier: string,
) {
  const entity = graph.aggregatorView.getEntities()?.[identifier].aggregatedEntity;
  if (entity === undefined) {
    notifications.error(`Can not find the entity with identifier '${identifier}'.`);
    return;
  }
  //
  if (isSemanticModelClass(entity) || isSemanticModelClassProfile(entity)) {
    const initialState = createNewProfileClassDialogState(
      classes, graph, visualModel, options.language, [entity.id]);
    const onConfirm = (state: ClassProfileDialogState) => {

      const result = cmeExecutor.createClassProfile(
        classProfileDialogStateToNewCmeClassProfile(state));
      cmeExecutor.updateSpecialization(result, state.model.identifier,
        [], state.specializations);

      if (isWritableVisualModel(visualModel)) {
        // TODO PeSk Update visual model
        addSemanticClassProfileToVisualModelAction(
          notifications, graph, classes, visualModel, diagram,
          result.identifier, result.model,
          position);
      };
    };
    dialogs.openDialog(createNewClassProfileDialog(initialState, onConfirm));
    return;
  }

  if (isSemanticModelAttribute(entity) || isSemanticModelAttributeProfile(entity)) {
    const initialState = createNewAttributeProfileDialogState(
      classes, graph, visualModel, options.language, [entity.id]);
    const onConfirm = (state: AttributeProfileDialogState) => {

      const result = cmeExecutor.createRelationshipProfile(
        attributeProfileDialogStateToNewCmeRelationshipProfile(state));
      cmeExecutor.updateSpecialization(result, state.model.identifier,
        [], state.specializations);

      if (result?.identifier !== undefined) {
        // TODO PeSk Update visual model
        addSemanticAttributeToVisualModelAction(
          notifications, visualModel, state.domain.identifier,
          result.identifier, true);
      }
    };
    dialogs.openDialog(createEditAttributeProfileDialog(initialState, onConfirm));
    return;
  }

  if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity)) {
    const initialState = createNewAssociationProfileDialogState(
      classes, graph, visualModel, options.language, [entity.id]);
    const onConfirm = (state: AssociationProfileDialogState) => {

      const result = cmeExecutor.createRelationshipProfile(
        associationProfileDialogStateToNewCmeRelationshipProfile(state));
      cmeExecutor.updateSpecialization(result, state.model.identifier,
        [], state.specializations);

      if (isWritableVisualModel(visualModel)) {
        // TODO PeSk Update visual model
        addSemanticRelationshipProfileToVisualModelAction(
          notifications, graph, visualModel,
          result.identifier, result.model);
      }
    };
    dialogs.openDialog(createNewAssociationProfileDialog(initialState, onConfirm));
    return;
  }

  if (isSemanticModelGeneralization(entity)) {
    notifications.error("Generalization modification is not supported!");
    return;
  }

  notifications.error("Unknown entity type.");
}
