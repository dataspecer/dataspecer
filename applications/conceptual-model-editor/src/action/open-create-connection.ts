import {
  isSemanticModelClass,
  SemanticModelClass,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { WritableVisualModel } from "@dataspecer/visual-model";

import { UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../configuration/options";
import {
  ConnectionType,
  CreateConnectionState,
  createConnectionDialog,
} from "../dialog/obsolete/create-connection-dialog";
import { InvalidState, UnsupportedOperationException } from "../application/error";
import { createLogger } from "../application";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  createVisualModelOperationExecutor,
  VisualModelOperationExecutor,
} from "../dataspecer/visual-model/visual-model-operation-executor";
import { withErrorBoundary } from "./utilities/error-utilities";
import { CmeOperationExecutor, cmeOperations } from "../operation";
import { reportFailure } from "./utilities/report-failure";
import { ClassesContext } from "../context/classes-context";

const LOG = createLogger(import.meta.url);

export function openCreateConnectionDialogAction(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  classes: ClassesContext,
  visualModel: WritableVisualModel,
  //
  semanticSource: string,
  semanticTarget: string,
  visualSource: string,
  visualTarget: string,
) {
  withErrorBoundary(notifications,
    () => openCreateConnectionDialogActionInternal(
      executor, options, dialogs, notifications, graph, classes, visualModel,
      semanticSource, semanticTarget, visualSource, visualTarget
    ));
}

/**
 * Handle situation when user drag a connection from one node to another.
 */
function openCreateConnectionDialogActionInternal(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  classes: ClassesContext,
  visualModel: WritableVisualModel,
  //
  semanticSource: string,
  semanticTarget: string,
  visualSource: string,
  visualTarget: string,
) {
  const { source, target } =
    findSourceAndTarget(graph, semanticSource, semanticTarget);
  //
  const visualExecutor = createVisualModelOperationExecutor(visualModel);
  // We decide based on source and target type.
  if (isSemanticModelClass(source)
    && isSemanticModelClass(target)) {
    // Can be a relationship or generalization.
    openRelationshipOrGeneralizationDialog(
      options, dialogs, notifications, visualExecutor, classes, executor,
      source, target, visualSource, visualTarget);
  }
  else if (isSemanticModelClassProfile(source)
    && isSemanticModelClass(target)) {
    // Create a profile from class to the profile.
    void createProfile(executor, notifications, classes, visualExecutor, source, target);
  }
  else if (isSemanticModelClassProfile(source)
    && isSemanticModelClassProfile(target)) {
    // Create a relationship profile or generalization for profiles.
    // We do not support this yet.

    const sourceModel = classes.sourceModelOfEntityMap.get(source.id);
    const targetModel = classes.sourceModelOfEntityMap.get(target.id);

    if (sourceModel === undefined || targetModel === undefined) {
      LOG.error("Missing model for entity.",
        { source, target, sourceModel, targetModel });
      throw new InvalidState();
    }

    if (sourceModel !== targetModel) {
      LOG.error("Ignored operation as there is no single model.",
        { source: sourceModel, target: targetModel });
      return;
    }

    void createGeneralizationWithVisualEnds(
      executor, notifications, visualExecutor, sourceModel,
      source.id, target.id, visualSource, visualTarget);
  }
  else {
    // We do not know.
    throw new UnsupportedOperationException();
  }
}

/**
 * @throws {InvalidState}
 */
function findSourceAndTarget(
  graph: UseModelGraphContextType,
  sourceIdentifier: string,
  targetIdentifier: string,
) {
  const entities = graph.getAggregatedEntities();
  const source = entities[sourceIdentifier]?.aggregatedEntity ?? null;
  const target = entities[targetIdentifier]?.aggregatedEntity ?? null;
  if (source === null || target === null) {
    LOG.error("Can not find a source or a target in the semantic model.",
      { source, target, sourceIdentifier, targetIdentifier, entities });
    throw new InvalidState();
  }
  return { source, target };
}

function openRelationshipOrGeneralizationDialog(
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  visualExecutor: VisualModelOperationExecutor,
  classesContext: ClassesContext,
  executor: CmeOperationExecutor,
  source: SemanticModelClass,
  target: SemanticModelClass,
  visualSource: string,
  visualTarget: string,
) {
  const onConfirm = async (state: CreateConnectionState) => {
    switch (state.type) {
    case ConnectionType.Association:
      await createRelationship(
        executor, notifications, visualExecutor, state, visualSource, visualTarget);
      break;
    case ConnectionType.Generalization:
      await createGeneralizationWithVisualEnds(
        executor, notifications, visualExecutor, state.model.getId(),
        state.source.id, state.target.id, visualSource, visualTarget);
      break;
    }
  };

  dialogs.openDialog(createConnectionDialog(
    classesContext, source, target, options.language, onConfirm));

}

async function createRelationship(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  visualExecutor: VisualModelOperationExecutor,
  state: CreateConnectionState,
  visualSource: string,
  visualTarget: string,
) {
  const args = cmeOperations.createSemanticRelationship.create(executor.createContext, {
    semanticModel: state.model.getId(),
    iri: state.iri,
    name: state.name,
    description: state.description ?? null,
    domain: state.source.id,
    domainCardinality: state.sourceCardinality,
    range: state.target.id,
    rangeCardinality: state.targetCardinality,
    externalDocumentationUrl: null,
    order: null,
  });
  const outcome = await executor.execute(args);
  if (reportFailure(notifications, outcome, "Can not create the association.")) {
    return;
  }
  withErrorBoundary(notifications, () =>
    visualExecutor.addRelationshipWithSpecifiedVisualEnds(
      { identifier: args.identifier, model: args.semanticModel },
      [visualSource], [visualTarget]));
}

async function createGeneralizationWithVisualEnds(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  visualExecutor: VisualModelOperationExecutor,
  model: string,
  child: string,
  parent: string,
  visualSource: string,
  visualTarget: string,
) {
  const args = cmeOperations.createSemanticGeneralization.create(executor.createContext, {
    semanticModel: model,
    // https://github.com/dataspecer/dataspecer/issues/537
    iri: null,
    child,
    parent,
  });
  const outcome = await executor.execute(args);
  if (reportFailure(notifications, outcome, "Can not create the generalization.")) {
    return;
  }
  withErrorBoundary(notifications, () =>
    visualExecutor.addGeneralizationWithSpecifiedVisualEnds(
      { identifier: args.identifier, model },
      [visualSource], [visualTarget]));
}

async function createProfile(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContext,
  visualExecutor: VisualModelOperationExecutor,
  source: SemanticModelClassProfile,
  target: SemanticModelClass,
) {

  const sourceModel = classes.sourceModelOfEntityMap.get(source.id);
  const targetModel = classes.sourceModelOfEntityMap.get(target.id);

  if (sourceModel === undefined || targetModel === undefined) {
    LOG.error("Missing model for entity.",
      { source, target, sourceModel, targetModel });
    notifications.error("Can not find the model of the class profile or the class.");
    return;
  }

  const prevProfiles = source.profiling;
  if (!prevProfiles.includes(target.id)) {
    // We update the class profile.
    const outcome = await executor.execute(
      cmeOperations.changeProfileClass.create(executor.createContext, {
        profileModel: sourceModel,
        entity: source.id,
        changes: { profileOf: [...prevProfiles, target.id] },
      }));
    if (reportFailure(notifications, outcome, "Can not update the class profile.")) {
      return;
    }
  }

  // Now we add to the visual.
  withErrorBoundary(notifications, () =>
    visualExecutor.addProfile({
      identifier: source.id,
      model: sourceModel,
    }, {
      identifier: target.id,
      model: targetModel,
    }));
}
