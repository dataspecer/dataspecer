import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  AssociationProfileDialogState,
  createEditAssociationProfileDialogState,
} from "../dialog/association-profile/edit-association-profile-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditAssociationProfileDialog } from "../dialog/association-profile/edit-association-profile-dialog";
import {
  associationProfileDialogStateToNewCmeRelationshipProfile,
} from "../dialog/association-profile/edit-association-profile-dialog-state-adapter";
import { createLogger } from "../application";
import { InvalidState } from "../application/error";
import { LabelResolver } from "../dependency-tracker";

const LOG = createLogger(import.meta.url);

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipProfile,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const aggregate = graph.aggregatorView.getEntities()?.[entity.id];
  const rawEntity = aggregate?.rawEntity;
  const aggregatedEntity = aggregate?.aggregatedEntity;
  if (!isSemanticModelRelationshipProfile(rawEntity)
    || !isSemanticModelRelationshipProfile(aggregatedEntity)) {
    LOG.error("Entity is not of expected type.", { rawEntity, aggregatedEntity });
    throw new InvalidState();
  }

  const initialState = createEditAssociationProfileDialogState(
    visualModel, options.language, model, rawEntity, aggregatedEntity,
    graph.models, tracker, labelResolver);

  const onConfirm = (state: AssociationProfileDialogState) => {
    cmeExecutor.updateRelationshipProfile({
      identifier: entity.id,
      ...associationProfileDialogStateToNewCmeRelationshipProfile(state),
    });
    cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);
  };

  dialogs.openDialog(createEditAssociationProfileDialog(initialState, onConfirm));
}
