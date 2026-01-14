import { useEffect, useMemo } from "react";

import {
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  VisualDiagramNode,
  type VisualEntity,
  VisualGroup,
  type VisualModel,
  type VisualNode,
  type VisualProfileRelationship,
  type VisualRelationship,
  isVisualDiagramNode,
  isVisualGroup,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  isWritableVisualModel,
} from "@dataspecer/visual-model";
import {
  AggregatedEntityWrapper,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  type SemanticModelClassProfile,
  type SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { type UseModelGraphContextType, useModelGraphContext } from "./context/model-context";
import { type UseClassesContextType, useClassesContext } from "./context/classes-context";
import { cardinalityToHumanLabel, getDomainAndRange } from "./util/relationship-utils";
import { useActions } from "./action/actions-react-binding";
import {
  DiagramOptions,
  EntityColor,
  LabelVisual,
  ProfileOfVisual,
} from "./diagram/model";
import {
  Diagram, type Edge, EdgeType, Group, type NodeItem, type Node, NodeType,
  NODE_ITEM_TYPE, NodeRelationshipItem, NodeTitleItem, NODE_TITLE_ITEM_TYPE,
  VisualModelDiagramNode, DiagramNodeTypes,
} from "./diagram/";
import { type UseDiagramType } from "./diagram/diagram-hook";
import { configuration, createLogger } from "./application";
import { t, tData } from "./application/localization";
import { getDescriptionLanguageString } from "./util/name-utils";
import { getLocalizedStringFromLanguageString } from "./util/language-utils";
import { isIriAbsolute } from "./util/iri-utils";
import { findSourceModelOfEntity } from "./service/model-service";
import { Entity, type EntityModel } from "@dataspecer/core-v2";
import { useOptions } from "./configuration/options";
import { getGroupMappings } from "./action/utilities";
import {
  synchronizeOnAggregatorChange,
  updateVisualAttributesBasedOnSemanticChanges,
} from "./dataspecer/visual-model/aggregator-to-visual-model-adapter";
import { EntityDsIdentifier } from "./dataspecer/entity-model";
import { getEntityLabelToShowInDiagram } from "./util/utils";
import { SemanticModel } from "./dataspecer/semantic-model";
import { CmeRelationshipProfileMandatoryLevel } from "./dataspecer/cme-model";
import { asMandatoryLevel, selectDomainAndRange } from "./dataspecer/cme-model/adapter/adapter-utilities";

import "./visualization.css";
import { isInMemorySemanticModel } from "./dataspecer/semantic-model";
import { validateVisualModel } from "./visualization-validation";

const LOG = createLogger(import.meta.url);

const DEFAULT_MODEL_COLOR = configuration().defaultModelColor;

type ExtendedOptions = {
  language: string
} & DiagramOptions;

type SemanticModelMap = Map<string, EntityModel>;

type SemanticEntityRecord = Record<string, AggregatedEntityWrapper>;

export const Visualization = () => {
  const options = useOptions();
  const graph = useModelGraphContext();
  const actions = useActions();
  const classesContext = useClassesContext();

  const aggregatorView = graph.aggregatorView;
  const activeVisualModel = useMemo(() => aggregatorView.getActiveVisualModel(), [aggregatorView]);

  const extendedOptions: ExtendedOptions = useMemo(() => ({
    language: options.language,
    entityMainColor: EntityColor.Entity,
    labelVisual: LabelVisual.Entity,
    profileOfVisual: ProfileOfVisual.Entity,
    displayRangeDetail: true,
    displayRelationshipProfileArchetype: false,
    profileOfLabel: tData("diagram.profile-of", options.language),
  }), [options.language]);

  useEffect(() => {
    const previousEntities = aggregatorView.getEntities();
    const unsubscribeSemanticAggregatorCallback = aggregatorView.subscribeToChanges((updated, removed) => {
      console.log("[VISUALIZATION] SemanticModelAggregatorView.subscribeToChanges", { updated, removed });
      if (isWritableVisualModel(activeVisualModel)) {
        synchronizeOnAggregatorChange(activeVisualModel, updated, removed);
        updateVisualAttributesBasedOnSemanticChanges(activeVisualModel, updated, removed, previousEntities);
      }
    });

    const unsubscribeCanvasCallback = activeVisualModel?.subscribeToChanges({
      modelColorDidChange(model) {
        if (activeVisualModel === null) {
          return;
        }
        // We ignore model color changes here for now.
        console.log("[VISUALIZATION] VisualModel.subscribeToChanges.modelColorDidChange", { model });
        propagateVisualModelColorChangesToVisualization(
          extendedOptions, activeVisualModel, actions.diagram, aggregatorView, graph, model);
      },
      visualEntitiesDidChange(changes) {
        if (activeVisualModel === null) {
          return;
        }
        console.log("[VISUALIZATION] VisualModel.subscribeToChanges.visualEntitiesDidChange", { changes });
        onChangeVisualEntities(
          extendedOptions, activeVisualModel, actions.diagram, aggregatorView, graph, changes);
      },
    });

    return () => {
      unsubscribeSemanticAggregatorCallback();
      unsubscribeCanvasCallback?.();
    };

  }, [options, activeVisualModel, actions, aggregatorView, graph]);

  // Update canvas content on view change.
  useEffect(() => {
    console.log("[VISUALIZATION] Something has changed, recreating diagram visual.", activeVisualModel);
    validateVisualModel(actions, activeVisualModel, aggregatorView, classesContext, graph.models);
    onChangeVisualModel(
      extendedOptions, activeVisualModel, actions.diagram, aggregatorView,
      classesContext, graph);
  }, [options, activeVisualModel, actions, aggregatorView, classesContext, graph]);

  return (
    <>
      <div className="h-[80vh] w-full md:h-full">
        {actions.diagram === null ? null : <Diagram diagram={actions.diagram} />}
      </div>
    </>
  );
};

function propagateVisualModelColorChangesToVisualization(
  options: ExtendedOptions,
  visualModel: VisualModel | null,
  diagram: UseDiagramType | null,
  aggregatorView: SemanticModelAggregatorView,
  graphContext: UseModelGraphContextType,
  changedModelIdentifier: string,
) {
  if (visualModel === null) {
    LOG.warn("Visual model change is ignored as visual model is not ready! This should not happen.");
    return;
  }
  if (diagram === null || !diagram.areActionsReady) {
    LOG.warn("Visual model change is ignored as the diagram is not ready!");
    return;
  }

  // We need to re-render entities from the model.
  // We just collect them and use the other visual update method,
  // simulating change in the entities.
  // TODO We should not reuse the function in this way, but it was quick solution.
  const changes: {
    previous: VisualEntity | null;
    next: VisualEntity | null;
  }[] = [];

  // We need to update all entities from given model.
  // The entities remain the same as the change is in the model.
  for (const [_, entity] of visualModel.getVisualEntities()) {
    if (isVisualNode(entity)) {
      if (entity.model === changedModelIdentifier) {
        changes.push({ previous: entity, next: entity });
      }
    } else if (isVisualRelationship(entity)) {
      if (entity.model === changedModelIdentifier) {
        changes.push({ previous: entity, next: entity });
      }
    }
  }

  // Call the change method.
  onChangeVisualEntities(
    options, visualModel, diagram, aggregatorView,
    graphContext, changes)
}

/**
 * Set content of nodes and edges from the visual model.
 * Effectively erase any previous content.
 */
function onChangeVisualModel(
  options: ExtendedOptions,
  visualModel: VisualModel | null,
  diagram: UseDiagramType | null,
  aggregatorView: SemanticModelAggregatorView,
  _classesContext: UseClassesContextType,
  graphContext: UseModelGraphContextType,
) {
  if (diagram === null || !diagram.areActionsReady) {
    LOG.warn("Visual model change is ignored as the diagram is not ready!");
    return;
  }
  if (visualModel === null) {
    // We just set content to nothing and return.
    void diagram.actions().setContent([], [], []);
    return;
  }

  const models = graphContext.models;
  const entities = aggregatorView.getEntities();

  const nextNodes: DiagramNodeTypes[] = [];
  const nextEdges: Edge[] = [];
  const nextGroups: VisualGroup[] = [];

  const visualEntities = visualModel.getVisualEntities().values();
  const { nodeToGroupMapping } = getGroupMappings(visualModel);

  for (const visualEntity of visualEntities) {
    if (isVisualDiagramNode(visualEntity)) {
      const node = createVisualModelDiagramNode(
        options, aggregatorView.getAvailableVisualModels(),
        visualEntity, nodeToGroupMapping[visualEntity.identifier] ?? null);
      nextNodes.push(node);
    } else if (isVisualGroup(visualEntity)) {
      nextGroups.push(visualEntity);
      continue;
    } else if (isVisualNode(visualEntity)) {
      const entity = entities[visualEntity.representedEntity]?.aggregatedEntity ?? null;
      if (isSemanticModelClass(entity) || isSemanticModelClassProfile(entity)) {
        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          console.error("Ignored entity for missing model.", { entity });
          continue;
        }
        const node = createDiagramNode(
          options, visualModel, models, entities,
          visualEntity, entity, model,
          nodeToGroupMapping[visualEntity.identifier] ?? null);
        nextNodes.push(node);
      }
    } else if (isVisualRelationship(visualEntity)) {
      const entity = entities[visualEntity.representedRelationship]?.aggregatedEntity ?? null;
      const isRelationship =
        isSemanticModelRelationship(entity) ||
        isSemanticModelRelationshipProfile(entity) ||
        isSemanticModelGeneralization(entity);
      if (isRelationship) {
        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          console.error("Ignored entity for missing model.", { entity });
          continue;
        }
        const edge = createDiagramEdge(
          options, visualModel, models, entities,
          visualEntity, entity, model);
        if (edge !== null) {
          nextEdges.push(edge);
        }
      }
    } else if (isVisualProfileRelationship(visualEntity)) {
      const entity = entities[visualEntity.entity]?.aggregatedEntity ?? null;
      if (entity === null) {
        console.error("Ignored entity as aggregate is null.", { visualEntity });
        continue;
      }
      const model = findSourceModelOfEntity(entity.id, models);
      if (model === null) {
        console.error("Ignored entity for missing model.", { entity });
        continue;
      }
      const profiled: EntityDsIdentifier[] = [];
      if (isSemanticModelClassProfile(entity)) {
        profiled.push(...entity.profiling);
      } else {
        console.error("Ignored profile relation as entity is not a usage or a profile.", { entity });
        continue;
      }
      // We can have multiple candidates, but we can add only the one represented
      // by the VisualProfileRelationship.
      for (const item of profiled) {
        const profilesOf = visualModel.getVisualEntitiesForRepresented(item);
        for (const profileOf of profilesOf) {
          if (visualEntity.visualSource !== profileOf.identifier &&
            visualEntity.visualTarget !== profileOf.identifier) {
            // The VisualProfileRelationship represents different profile relationship.
            continue;
          }
          const edge = createDiagramEdgeForClassUsageOrProfile(
            options, visualModel, visualEntity, entity, options.language);
          if (edge !== null) {
            nextEdges.push(edge);
          }
        }
      }
    }
    // For now we ignore all other.
  }

  const groupsToSetContentWith = nextGroups.map(visualGroup => ({
    group: createGroupNode(visualGroup),
    content: visualGroup.content,
  }));

  // We do not wait for the promise.
  void diagram.actions().setContent(nextNodes, nextEdges, groupsToSetContentWith);
}

function createVisualModelDiagramNode(
  options: ExtendedOptions,
  availableVisualModels: VisualModel[],
  visualDiagramNode: VisualDiagramNode,
  group: string | null,
): VisualModelDiagramNode {
  const referencedVisualModel = availableVisualModels.find(
    model => model.getIdentifier() === visualDiagramNode.representedVisualModel);
  let referencedVisualModelLabel = referencedVisualModel === undefined ?
    "" :
    getLocalizedStringFromLanguageString(referencedVisualModel.getLabel(), options.language);
  if (referencedVisualModelLabel === null) {
    referencedVisualModelLabel = "Visual model node";
  }

  const result: VisualModelDiagramNode = {
    identifier: visualDiagramNode.identifier,
    externalIdentifier: visualDiagramNode.representedVisualModel,
    representedModelAlias: referencedVisualModelLabel,
    label: referencedVisualModelLabel,
    group,
    position: {
      x: visualDiagramNode.position.x,
      y: visualDiagramNode.position.y,
      anchored: visualDiagramNode.position.anchored
    },
  };

  return result;
}

function createDiagramNode(
  options: ExtendedOptions,
  visualModel: VisualModel,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  visualNode: VisualNode,
  entity: SemanticModelClass | SemanticModelClassProfile,
  _semanticModel: EntityModel,
  group: string | null,
): Node {

  const isProfile = isSemanticModelClassProfile(entity);

  return {
    options,
    type: isProfile ? NodeType.ClassProfile : NodeType.Class,
    identifier: visualNode.identifier,
    externalIdentifier: entity.id,
    label: getEntityLabelToShowInDiagram(options.language, entity),
    iri: prepareIri(semanticModels, null, entity),
    color: visualModel.getModelColor(visualNode.model) ?? DEFAULT_MODEL_COLOR,
    description: getEntityDescription(options.language, entity),
    group,
    position: {
      ...visualNode.position
    },
    profileOf: prepareProfileOf(
      options, semanticModels, entities, entity),
    items: prepareItems(
      options, visualModel, semanticModels, entities, visualNode),
    vocabulary: prepareVocabulary(
      options, visualModel, semanticModels, entities, entity.id),
  };
}

function prepareItems(
  options: ExtendedOptions,
  visualModel: VisualModel,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  visualNode: VisualNode,
): NodeItem[] {
  // Be aware that the update of the semantic attributes comes later,
  // so there is moment when the content of visual node is set,
  // but the corresponding attributes semantic model in are not.
  // That is why we need to filter the result.
  const result: NodeItem[] = []
  let lastLevel: CmeRelationshipProfileMandatoryLevel | null = null;
  for (const identifier of visualNode.content) {
    const entity = entities[identifier]?.aggregatedEntity ?? null;
    let nextLevel: CmeRelationshipProfileMandatoryLevel | null = null;
    let nextItem: NodeItem | null = null;
    if (isSemanticModelRelationship(entity)) {
      const [domain, range] = selectDomainAndRange(entity.ends);
      const rangeEntity = entities[range.concept ?? ""]?.aggregatedEntity ?? null;
      if (rangeEntity === null) {
        LOG.warn("Missing range.", entity);
      }
      nextLevel = null;
      nextItem = {
        options,
        type: NODE_ITEM_TYPE,
        identifier: entity.id,
        label: getEntityLabelToShowInDiagram(options.language, entity),
        iri: prepareIri(semanticModels, null, entity),
        profileOf: [],
        vocabulary: prepareVocabulary(
          options, visualModel, semanticModels, entities, entity.id),
        cardinalitySource: cardinalityToHumanLabel(domain.cardinality),
        cardinalityTarget: cardinalityToHumanLabel(range.cardinality),
        range: {
          iri: prepareIri(semanticModels, null, rangeEntity),
          label: getEntityLabelToShowInDiagram(options.language, rangeEntity),
          vocabulary: prepareVocabulary(
            options, visualModel, semanticModels, entities, range.concept)
        },
      } as NodeRelationshipItem;
    } if (isSemanticModelRelationshipProfile(entity)) {
      const [domain, range] = selectDomainAndRange(entity.ends);
      const rangeEntity = entities[range.concept ?? ""]?.aggregatedEntity ?? null;
      if (rangeEntity === null) {
        LOG.warn("Missing range.", entity);
      }
      nextLevel = asMandatoryLevel(range.tags ?? []);
      nextItem = {
        options,
        type: NODE_ITEM_TYPE,
        identifier: entity.id,
        label: getEntityLabelToShowInDiagram(options.language, entity),
        iri: prepareIri(semanticModels, null, entity),
        profileOf: prepareProfileOf(
          options, semanticModels, entities, entity),
        vocabulary: prepareVocabulary(
          options, visualModel, semanticModels, entities, entity.id),
        cardinalitySource: cardinalityToHumanLabel(domain.cardinality),
        cardinalityTarget: cardinalityToHumanLabel(range.cardinality),
        range: {
          iri: prepareIri(semanticModels, null, rangeEntity),
          label: getEntityLabelToShowInDiagram(options.language, rangeEntity),
          vocabulary: prepareVocabulary(
            options, visualModel, semanticModels, entities, range.concept)
        },
      } as NodeRelationshipItem;
    }
    // Append to the list.
    if (nextItem === null) {
      continue;
    }
    if (lastLevel !== nextLevel) {
      result.push(createTitleNode(nextLevel, options.language));
    }
    lastLevel = nextLevel;
    result.push(nextItem);
  }
  return result;
}

function prepareVocabulary(
  options: ExtendedOptions,
  visualModel: VisualModel,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  identifier: string | null,
): {
  label: string,
  iri: string | null,
  color: string,
}[] {
  if (identifier === null) {
    return [];
  }
  const defaultColor = configuration().defaultModelColor;
  const result: { label: string, iri: string | null, color: string }[] = [];
  const visited: string[] = [];
  const stack: string[] = [identifier];
  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || visited.includes(next)) {
      continue;
    }
    visited.push(next);
    //
    const entity = entities[next]?.rawEntity;
    const model = findSourceModelOfEntity(next, semanticModels);
    if (isSemanticModelClass(entity) || isSemanticModelRelationship(entity)) {
      result.push({
        iri: prepareIri(semanticModels, null, entity),
        label: getEntityLabelToShowInDiagram(options.language, entity),
        color: visualModel.getModelColor(model?.getId() ?? "") ?? defaultColor,
      });
    } else if (isSemanticModelClassProfile(entity)) {
      stack.push(...entity.profiling);
    } else if (isSemanticModelRelationshipProfile(entity)) {
      const { range } = getDomainAndRange(entity);
      if (range === null) {
        continue;
      }
      stack.push(...range.profiling);
    }
  }
  return result;
}

function prepareIri(
  semanticModels: SemanticModelMap,
  semanticModel: SemanticModel | null,
  entity: Entity | null,
): string | null {
  if (entity === null) {
    // No entity return nothing.
    return null;
  }
  let iri: string | null = null;
  if (isSemanticModelClass(entity) || isSemanticModelClassProfile(entity)) {
    iri = entity.iri;
  } else if (isSemanticModelRelationship(entity)) {
    const { range } = getDomainAndRange(entity);
    iri = range?.iri ?? null;
  } else if (isSemanticModelRelationshipProfile(entity)) {
    const { range } = getDomainAndRange(entity);
    iri = range?.iri ?? null;
  } else if (isSemanticModelGeneralization(entity)) {
    iri = entity.iri;
  }
  if (iri === null) {
    // We have no IRI so return null.
    return null;
  }

  if (isIriAbsolute(iri)) {
    return applyIriPrefix(iri);
  }

  // For a relative IRI use model alias.
  const model = semanticModel
    ?? findSourceModelOfEntity(entity.id, semanticModels);
  if (model === null || !isInMemorySemanticModel(model)) {
    // We have no additional IRI information.
    return ":" + iri;
  }
  return applyIriPrefix(model.getBaseIri() + iri);
}

function applyIriPrefix(iri: string): string {
  const prefixes = configuration().prefixes;
  for (const [prefix, name] of Object.entries(prefixes)) {
    if (iri.startsWith(prefix)) {
      return name + ":" + iri.substring(prefix.length);
    }
  }
  return iri;
}

/**
 * Collect and return direct profiles.
 */
function prepareProfileOf(
  options: ExtendedOptions,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  entity: Entity | null,
): {
  label: string,
  iri: string | null,
}[] {
  let profiling: string[] = [];
  if (isSemanticModelClassProfile(entity)) {
    profiling = entity.profiling;
  } else if (isSemanticModelRelationshipProfile(entity)) {
    const { range } = getDomainAndRange(entity);
    if (range === null) {
      return [];
    }
    profiling = range.profiling;
  } else {
    return [];
  }
  //
  const result: { label: string, iri: string | null }[] = [];
  for (const identifier of profiling) {
    const entity = entities[identifier]?.aggregatedEntity;
    if (entity === undefined) {
      continue;
    }
    result.push({
      label: getEntityLabelToShowInDiagram(options.language, entity),
      iri: prepareIri(semanticModels, null, entity),
    })
  }
  return result;
}

function createTitleNode(
  level: CmeRelationshipProfileMandatoryLevel | null,
  language: string,
): NodeTitleItem {
  return {
    type: NODE_TITLE_ITEM_TYPE,
    title: selectMandatoryLevel(level, language) ?? "<<undefined>>",
  }
}

function selectMandatoryLevel(
  level: CmeRelationshipProfileMandatoryLevel | null,
  language: string,
): string | null {
  switch (level) {
    case CmeRelationshipProfileMandatoryLevel.Mandatory:
      return tData("diagram.mandatory-level.mandatory", language);
    case CmeRelationshipProfileMandatoryLevel.Optional:
      return tData("diagram.mandatory-level.optional", language);
    case CmeRelationshipProfileMandatoryLevel.Recommended:
      return tData("diagram.mandatory-level.recommended", language);
  }
  return null;
}

function getEntityDescription(language: string, entity: Entity) {
  return getLocalizedStringFromLanguageString(
    getDescriptionLanguageString(entity), language);
}

function createDiagramEdge(
  options: ExtendedOptions,
  visualModel: VisualModel,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  visualRelationship: VisualRelationship,
  entity: SemanticModelRelationship | SemanticModelGeneralization | SemanticModelRelationshipProfile,
  semanticModel: SemanticModel,
): Edge | null {
  const identifier = entity.id;
  if (isSemanticModelRelationship(entity)) {
    return createDiagramEdgeForRelationship(
      options, visualModel, semanticModels, entities, visualRelationship,
      entity, semanticModel);
  } else if (isSemanticModelRelationshipProfile(entity)) {
    return createDiagramEdgeForRelationshipProfile(
      options, visualModel, semanticModels, entities, visualRelationship,
      entity, semanticModel);
  } else if (isSemanticModelGeneralization(entity)) {
    return createDiagramEdgeForGeneralization(
      options, visualModel, visualRelationship, entity);
  }
  throw Error(`Unknown entity type ${identifier}.`);
}

function createDiagramEdgeForRelationship(
  options: ExtendedOptions,
  visualModel: VisualModel,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  visualRelationship: VisualRelationship,
  entity: SemanticModelRelationship,
  semanticModel: SemanticModel
): Edge {
  const language = options.language;
  const { domain, range } = getDomainAndRange(entity);
  return {
    options,
    type: EdgeType.Association,
    identifier: visualRelationship.identifier,
    externalIdentifier: entity.id,
    label: getEntityLabelToShowInDiagram(language, entity),
    source: visualRelationship.visualSource,
    cardinalitySource: cardinalityToHumanLabel(domain?.cardinality),
    target: visualRelationship.visualTarget,
    cardinalityTarget: cardinalityToHumanLabel(range?.cardinality),
    color: visualModel.getModelColor(visualRelationship.model) ?? DEFAULT_MODEL_COLOR,
    waypoints: visualRelationship.waypoints,
    profileOf: [],
    vocabulary: prepareVocabulary(
      options, visualModel, semanticModels, entities, entity.id),
    iri: prepareIri(semanticModels, semanticModel, entity),
    mandatoryLevelLabel: null,
  };
}

function createDiagramEdgeForRelationshipProfile(
  options: ExtendedOptions,
  visualModel: VisualModel,
  semanticModels: SemanticModelMap,
  entities: SemanticEntityRecord,
  visualRelationship: VisualRelationship,
  entity: SemanticModelRelationshipProfile,
  semanticModel: SemanticModel
): Edge {
  const { domain, range } = getDomainAndRange(entity);
  const label = getEntityLabelToShowInDiagram(options.language, entity);
  const iri = prepareIri(semanticModels, semanticModel, entity);
  const color = visualModel.getModelColor(visualRelationship.model) ?? DEFAULT_MODEL_COLOR;
  return {
    options,
    type: EdgeType.AssociationProfile,
    identifier: visualRelationship.identifier,
    externalIdentifier: entity.id,
    label,
    iri,
    source: visualRelationship.visualSource,
    cardinalitySource: cardinalityToHumanLabel(domain?.cardinality),
    target: visualRelationship.visualTarget,
    cardinalityTarget: cardinalityToHumanLabel(range?.cardinality),
    color,
    waypoints: visualRelationship.waypoints,
    profileOf: prepareProfileOf(
      options, semanticModels, entities, entity),
    vocabulary: prepareVocabulary(
      options, visualModel, semanticModels, entities, entity.id),
    mandatoryLevelLabel: asMandatoryLevel(range?.tags ?? []),
  };
}

function createDiagramEdgeForGeneralization(
  diagramOptions: DiagramOptions,
  visualModel: VisualModel,
  visualRelationship: VisualRelationship,
  entity: SemanticModelGeneralization,
): Edge {
  const color = visualModel.getModelColor(visualRelationship.model) ?? DEFAULT_MODEL_COLOR;
  return {
    type: EdgeType.Generalization,
    identifier: visualRelationship.identifier,
    externalIdentifier: entity.id,
    label: null,
    source: visualRelationship.visualSource,
    cardinalitySource: null,
    target: visualRelationship.visualTarget,
    cardinalityTarget: null,
    color,
    waypoints: visualRelationship.waypoints,
    profileOf: [],
    iri: null,
    options: diagramOptions,
    vocabulary: [{
      label: null,
      iri: null,
      color,
    }],
    mandatoryLevelLabel: null,
  };
}

/**
 * Create an edge to represent a profile between two classes.
 */
function createDiagramEdgeForClassUsageOrProfile(
  diagramOptions: DiagramOptions,
  visualModel: VisualModel,
  visualProfileRelationship: VisualProfileRelationship,
  entity: SemanticModelClassProfile,
  language: string,
): Edge | null {
  return {
    type: EdgeType.ClassProfile,
    identifier: visualProfileRelationship.identifier,
    externalIdentifier: entity.id,
    label: tData("diagram.profile-edge", language),
    source: visualProfileRelationship.visualSource,
    cardinalitySource: null,
    target: visualProfileRelationship.visualTarget,
    cardinalityTarget: null,
    color: "#000000",
    waypoints: visualProfileRelationship.waypoints,
    profileOf: [],
    iri: null,
    options: diagramOptions,
    vocabulary: [],
    mandatoryLevelLabel: null,
  };
}

function createGroupNode(visualGroup: VisualGroup): Group {
  return {
    identifier: visualGroup.identifier,
  };
}

/**
 * This method is also called when there is a change in model color!
 */
function onChangeVisualEntities(
  options: ExtendedOptions,
  visualModel: VisualModel | null,
  diagram: UseDiagramType | null,
  aggregatorView: SemanticModelAggregatorView,
  graphContext: UseModelGraphContextType,
  changes: {
    previous: VisualEntity | null;
    next: VisualEntity | null;
  }[]
) {
  if (diagram === null || !diagram.areActionsReady) {
    LOG.warn("Visual entities change is ignored as the diagram is not ready!");
    return;
  }
  if (visualModel === null) {
    // We just set content to nothing and return.
    void diagram.actions().setContent([], [], []);
    return;
  }

  const models = graphContext.models;
  const entities = aggregatorView.getEntities();
  const actions = diagram.actions();

  const groups = changes.filter(({ previous, next }) =>
    (previous !== null && isVisualGroup(previous))
    || (next !== null && isVisualGroup(next)));

  const nodeIdToParentGroupIdMap: Record<string, string> = {};
  for (const { previous, next } of groups) {
    if (previous !== null && next === null) {
      // Entity removed
      actions.removeGroups([previous.identifier]);
      continue;
    }

    if (next === null) {
      continue;
    }
    // Have to cast, even though we know the type
    const nextVisualGroup = next as VisualGroup;
    const group = createGroupNode(nextVisualGroup);

    if (previous === null) {
      // Create new entity.
      actions.addGroups([{ group, content: nextVisualGroup.content }], false);
      nextVisualGroup.content.forEach(nodeIdGroupId => {
        nodeIdToParentGroupIdMap[nodeIdGroupId] = group.identifier;
      });
    } else {
      // Change of existing - occurs when removing node from canvas
      actions.setGroup(group, nextVisualGroup.content);
    }
  }

  for (const { previous, next } of changes) {
    if (next !== null) {
      // New or changed entity.
      if (isVisualDiagramNode(next)) {
        let group: string | null = null;
        if (nodeIdToParentGroupIdMap[next.identifier] !== undefined) {
          group = nodeIdToParentGroupIdMap[next.identifier];
        }

        const node = createVisualModelDiagramNode(
          options, aggregatorView.getAvailableVisualModels(), next, group);
        if (previous === null) {
          // Create new entity.
          actions.addNodes([node]);
        } else {
          // Change of existing.
          actions.updateNodes([node]);
        }
      } else if (isVisualNode(next)) {
        const entity = entities[next.representedEntity]?.aggregatedEntity ?? null;

        if (!isSemanticModelClass(entity) && !isSemanticModelClassProfile(entity)) {
          LOG.error(
            "In visual update semantic entity is not class/usage/profile.",
            { entity, visual: next });
          continue;
        }

        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          LOG.error("Ignored entity for missing model.", { entity });
          continue;
        }

        let group: string | null = null;
        if (nodeIdToParentGroupIdMap[next.identifier] !== undefined) {
          group = nodeIdToParentGroupIdMap[next.identifier];
        }

        const node = createDiagramNode(
          options, visualModel, models, entities, next, entity, model, group);

        if (previous === null) {
          // Create new entity.
          actions.addNodes([node]);
        } else {
          // Change of existing.
          actions.updateNodes([node]);
        }

      } else if (isVisualRelationship(next)) {
        const entity = entities[next.representedRelationship]?.aggregatedEntity ?? null;

        const isRelationship =
          isSemanticModelRelationship(entity) ||
          isSemanticModelGeneralization(entity) ||
          isSemanticModelRelationshipProfile(entity);
        if (!isRelationship) {
          console.error("In visual update semantic entity is not a relationship.",
            { entity, visual: next });
          continue;
        }

        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          console.error("Ignored entity for missing model.", { entity });
          continue;
        }

        const edge = createDiagramEdge(
          options, visualModel, models, entities, next, entity, model);

        if (edge === null) {
          console.error("In visual update created edge is null.", { entity, visual: next });
          continue;
        }

        if (previous === null) {
          // Create new entity.
          actions.addEdges([edge]);
        } else {
          // Change of existing.
          actions.updateEdges([edge]);
        }

      } else if (isVisualProfileRelationship(next)) {
        const entity = entities[next.entity]?.aggregatedEntity ?? null;

        const profiled: EntityDsIdentifier[] = [];
        if (isSemanticModelClassProfile(entity)) {
          profiled.push(...entity.profiling);
        } else {
          console.error(
            "Ignored profile relation as entity is not a usage or a profile.",
            { entity, visualEntity: next });
          continue;
        }
        // We can have multiple candidates, but we can add only the one represented
        // by the VisualProfileRelationship.
        const edgesToAdd = [];
        const edgesToUpdate = [];
        for (const item of profiled) {
          const profilesOf = visualModel.getVisualEntitiesForRepresented(item);
          for (const profileOf of profilesOf) {
            if (next.visualSource !== profileOf.identifier &&
              next.visualTarget !== profileOf.identifier) {
              // The VisualProfileRelationship represents different profile relationship.
              continue;
            }
            //
            const edge = createDiagramEdgeForClassUsageOrProfile(
              options, visualModel, next, entity, options.language);
            if (edge === null) {
              console.error("Ignored null edge.", { visualEntity: next, entity });
              break;
            }
            if (previous === null) {
              edgesToAdd.push(edge);
            } else {
              edgesToUpdate.push(edge);
            }
          }
        }
        if (edgesToAdd.length > 0) {
          // Create new entities.
          actions.addEdges(edgesToAdd);
        }
        if (edgesToUpdate.length > 0) {
          // Change of existing.
          actions.updateEdges(edgesToUpdate);
        }
      } else {
        // We ignore other properties.
      }
    }
    // ...
    if (previous !== null && next === null) {
      // Entity removed
      if (isVisualNode(previous)) {
        actions.removeNodes([previous.identifier]);
      } else if (isVisualRelationship(previous) || isVisualProfileRelationship(previous)) {
        actions.removeEdges([previous.identifier]);
      } else if (isVisualDiagramNode(previous)) {
        actions.removeNodes([previous.identifier]);
      } else {
        // We ignore other properties.
      }
    }
  }
}
