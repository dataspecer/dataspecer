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
import { withErrorBoundary } from "./utilities/error-utilities";
import { CmeOperationBatchBuilder, CmeOperationExecutor, cmeOperations } from "../operation";
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
  const visualEnds: VisualEnds = {
    visualModel: visualModel.getIdentifier(),
    visualSource,
    visualTarget,
  };
  // We decide based on source and target type.
  if (isSemanticModelClass(source)
    && isSemanticModelClass(target)) {
    // Can be a relationship or generalization.
    openRelationshipOrGeneralizationDialog(
      options, dialogs, notifications, classes, executor,
      source, target, visualEnds);
  }
  else if (isSemanticModelClassProfile(source)
    && isSemanticModelClass(target)) {
    // Create a profile from class to the profile.
    void createProfile(
      executor, notifications, classes, visualEnds.visualModel, source, target);
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
      executor, notifications, sourceModel, source.id, target.id, visualEnds);
  }
  else {
    // We do not know.
    throw new UnsupportedOperationException();
  }
}

/**
 * The visual nodes the user connected.
 */
interface VisualEnds {

  visualModel: string;

  visualSource: string;

  visualTarget: string;

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
  classesContext: ClassesContext,
  executor: CmeOperationExecutor,
  source: SemanticModelClass,
  target: SemanticModelClass,
  visualEnds: VisualEnds,
) {
  const onConfirm = async (state: CreateConnectionState) => {
    switch (state.type) {
    case ConnectionType.Association:
      await createRelationship(executor, notifications, state, visualEnds);
      break;
    case ConnectionType.Generalization:
      await createGeneralizationWithVisualEnds(
        executor, notifications, state.model.getId(),
        state.source.id, state.target.id, visualEnds);
      break;
    }
  };

  dialogs.openDialog(createConnectionDialog(
    classesContext, source, target, options.language, onConfirm));

}

async function createRelationship(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  state: CreateConnectionState,
  visualEnds: VisualEnds,
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
  const batch = new CmeOperationBatchBuilder(executor.createContext)
    .addArguments(args)
    .add(cmeOperations.showVisualEdge, { ...visualEnds, entity: args.identifier })
    .build();
  const outcome = await executor.execute(batch);
  reportFailure(notifications, outcome, "Can not create the association.");
}

async function createGeneralizationWithVisualEnds(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  model: string,
  child: string,
  parent: string,
  visualEnds: VisualEnds,
) {
  const args = cmeOperations.createSemanticGeneralization.create(executor.createContext, {
    semanticModel: model,
    // https://github.com/dataspecer/dataspecer/issues/537
    iri: null,
    child,
    parent,
  });
  const batch = new CmeOperationBatchBuilder(executor.createContext)
    .addArguments(args)
    .add(cmeOperations.showVisualEdge, { ...visualEnds, entity: args.identifier })
    .build();
  const outcome = await executor.execute(batch);
  reportFailure(notifications, outcome, "Can not create the generalization.");
}

async function createProfile(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContext,
  visualModel: string,
  source: SemanticModelClassProfile,
  target: SemanticModelClass,
) {
  const sourceModel = classes.sourceModelOfEntityMap.get(source.id);
  if (sourceModel === undefined) {
    LOG.error("Missing model for entity.", { source, target, sourceModel });
    notifications.error("Can not find the model of the class profile.");
    return;
  }

  const previous = source.profiling;
  if (previous.includes(target.id)) {
    // Already a profile, the visual model shows it already.
    return;
  }
  const next = [...previous, target.id];

  const batch = new CmeOperationBatchBuilder(executor.createContext)
    .add(cmeOperations.changeProfileClass, {
      profileModel: sourceModel,
      entity: source.id,
      changes: { profileOf: next },
    })
    .add(cmeOperations.updateVisualNodeProfiles, {
      visualModel,
      entity: source.id,
      model: sourceModel,
      previous,
      next,
    })
    .build();
  const outcome = await executor.execute(batch);
  reportFailure(notifications, outcome, "Can not update the class profile.");
}
