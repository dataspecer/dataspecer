import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { UseModelGraphContextType } from "../context/model-context";
import { ClassesContext } from "../context/classes-context";
import { Options } from "../application";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  ClassProfileDialogState,
  createEditClassProfileDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditClassProfileDialog } from "../dialog/class-profile/edit-class-profile-dialog";
import { createLogger } from "../application";
import { InvalidState } from "../application/error";
import { LabelResolver } from "../dependency-tracker";
import { applyVisualColorFromDialog } from "./utilities/visual-color-utilities";
import { CmeOperationExecutor } from "../operation";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createUpdateClassProfileBatch } from "./utilities/update-class-profile-batch";
import { reportFailure } from "./utilities/report-failure";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

const LOG = createLogger(import.meta.url);

export function openEditClassProfileDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClassProfile,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  availableVocabularies: ControlledVocabulary[],
) {
  const aggregate = graph.getAggregatedEntities()?.[entity.id];
  const rawEntity = aggregate?.rawEntity;
  if (rawEntity === null || rawEntity === undefined || !isSemanticModelClassProfile(rawEntity)) {
    LOG.error("Missing raw entity for class profile.", { entity });
    throw new InvalidState();
  }

  const initialState = createEditClassProfileDialogState(
    visualModel, options.language, model, rawEntity, classes.semanticModels, tracker,
    labelResolver, graph, availableVocabularies);

  const onConfirm = async (state: ClassProfileDialogState) => {
    const outcome = await executor.execute(createUpdateClassProfileBatch(
      executor.createContext, visualModel, entity.id, initialState, state));
    if (reportFailure(notifications, outcome, "Can not update the class profile.")) {
      return;
    }
    applyVisualColorFromDialog(
      executor, visualModel, entity.id, initialState, state);
  };

  dialogs.openDialog(createEditClassProfileDialog(initialState, onConfirm));
}
