import {
  isSemanticModelClass,
  SemanticModelClass,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { WritableVisualModel } from "@dataspecer/visual-model";

import { ModelGraphContextType } from "../context/model-context";
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
import { findSourceModelOfEntity } from "../service/model-service";
import { withErrorBoundary } from "./utilities/error-utilities";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";

const LOG = createLogger(import.meta.url);

export function openCreateConnectionDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  //
  semanticSource: string,
  semanticTarget: string,
  visualSource: string,
  visualTarget: string,
) {
  withErrorBoundary(notifications,
    () => openCreateConnectionDialogActionInternal(
      cmeExecutor, options, dialogs, graph, visualModel,
      semanticSource, semanticTarget, visualSource, visualTarget
    ));
}

/**
 * Handle situation when user drag a connection from one node to another.
 */
function openCreateConnectionDialogActionInternal(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
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
      options, dialogs, visualExecutor, graph, cmeExecutor,
      source, target, visualSource, visualTarget);
  }
  else if (isSemanticModelClassProfile(source)
    && isSemanticModelClass(target)) {
    // Create a profile from class to the profile.
    createProfile(cmeExecutor, graph, visualExecutor, source, target);
  }
  else if (isSemanticModelClassProfile(source)
    && isSemanticModelClassProfile(target)) {
    // Create a relationship profile or generalization for profiles.
    // We do not support this yet.

    const sourceModel = findSourceModelOfEntity(source.id, graph.models);
    const targetModel = findSourceModelOfEntity(target.id, graph.models);

    if (sourceModel === null || targetModel === null) {
      LOG.error("Missing model for entity.",
        { source, target, sourceModel, targetModel });
      throw new InvalidState();
    }

    if (sourceModel.getId() !== targetModel.getId()) {
      LOG.error("Ignored operation as there is no single model.",
        { source: sourceModel, target: targetModel });
      return;
    }

    const generalization = cmeExecutor.createGeneralization({
      model: sourceModel.getId(),
      // https://github.com/dataspecer/dataspecer/issues/537
      iri: null,
      childIdentifier: source.id,
      parentIdentifier: target.id,
    });

    visualExecutor.addGeneralizationWithSpecifiedVisualEnds(
      generalization, [visualSource], [visualTarget]);
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
  graph: ModelGraphContextType,
  sourceIdentifier: string,
  targetIdentifier: string,
) {
  const entities = graph.aggregatorView.getEntities();
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
  visualExecutor: VisualModelOperationExecutor,
  graph: ModelGraphContextType,
  cmeExecutor: CmeModelOperationExecutor,
  source: SemanticModelClass,
  target: SemanticModelClass,
  visualSource: string,
  visualTarget: string,
) {
  const onConfirm = (state: CreateConnectionState) => {
    switch (state.type) {
    case ConnectionType.Association:
      createRelationship(cmeExecutor, visualExecutor, state, visualSource, visualTarget);
      break;
    case ConnectionType.Generalization:
      createGeneralization(cmeExecutor, visualExecutor, state, visualSource, visualTarget);
      break;
    }
  };

  dialogs.openDialog(createConnectionDialog(
    graph, source, target, options.language, onConfirm));

}

function createRelationship(
  cmeExecutor: CmeModelOperationExecutor,
  visualExecutor: VisualModelOperationExecutor,
  state: CreateConnectionState,
  visualSource: string,
  visualTarget: string,
) {
  const relationship = cmeExecutor.createRelationship({
    model: state.model.getId(),
    iri: state.iri,
    name: state.name,
    description: state.description ?? null,
    domain: state.source.id,
    domainCardinality: state.sourceCardinality,
    range: state.target.id,
    rangeCardinality: state.targetCardinality,
    externalDocumentationUrl: null,
  });

  visualExecutor.addRelationshipWithSpecifiedVisualEnds(
    relationship, [visualSource], [visualTarget]);
}

function createGeneralization(
  cmeExecutor: CmeModelOperationExecutor,
  visualExecutor: VisualModelOperationExecutor,
  state: CreateConnectionState,
  visualSource: string,
  visualTarget: string,
) {
  const generalization = cmeExecutor.createGeneralization({
    model: state.model.getId(),
    // https://github.com/dataspecer/dataspecer/issues/537
    iri: null,
    childIdentifier: state.source.id,
    parentIdentifier: state.target.id,
  });

  visualExecutor.addGeneralizationWithSpecifiedVisualEnds(
    generalization, [visualSource], [visualTarget]);
}

function createProfile(
  cmeExecutor: CmeModelOperationExecutor,
  graph: ModelGraphContextType,
  visualExecutor: VisualModelOperationExecutor,
  source: SemanticModelClassProfile,
  target: SemanticModelClass,
) {
  const sourceModel = findSourceModelOfEntity(source.id, graph.models);
  const targetModel = findSourceModelOfEntity(target.id, graph.models);

  if (sourceModel === null || targetModel === null) {
    LOG.error("Missing model for entity.",
      { source, target, sourceModel, targetModel });
    throw new InvalidState();
  }

  const prevProfiles = source.profiling;
  if (!prevProfiles.includes(target.id)) {
    // We update the class profile.
    cmeExecutor.changeClassProfile({
      identifier: source.id,
      model: sourceModel.getId(),
      profileOf: [...prevProfiles, target.id],
    });
  }

  // Now we add to the visual.
  visualExecutor.addProfile({
    identifier: source.id,
    model: sourceModel.getId(),
  }, {
    identifier: target.id,
    model: targetModel.getId()
  });

}
