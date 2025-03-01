import { useEffect, useMemo } from "react";

import {
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  type SemanticModelClassUsage,
  type SemanticModelRelationshipUsage,
  isSemanticModelAttributeUsage,
  isSemanticModelClassUsage,
  isSemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import {
  type VisualEntity,
  VisualGroup,
  type VisualModel,
  type VisualNode,
  type VisualProfileRelationship,
  type VisualRelationship,
  isVisualGroup,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  isWritableVisualModel,
} from "@dataspecer/core-v2/visual-model";
import {
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";

import { type UseModelGraphContextType, useModelGraphContext } from "./context/model-context";
import { type UseClassesContextType, useClassesContext } from "./context/classes-context";
import { cardinalityToHumanLabel, getDomainAndRange } from "./util/relationship-utils";
import { useActions } from "./action/actions-react-binding";
import { Diagram, type Edge, EdgeType, Group, type EntityItem, type Node, NodeType } from "./diagram/";
import { type UseDiagramType } from "./diagram/diagram-hook";
import { configuration, createLogger } from "./application";
import { getDescriptionLanguageString, getFallbackDisplayName, getNameLanguageString, getUsageNoteLanguageString } from "./util/name-utils";
import { getLocalizedStringFromLanguageString } from "./util/language-utils";
import { getIri, getModelIri } from "./util/iri-utils";
import { findSourceModelOfEntity } from "./service/model-service";
import { type EntityModel } from "@dataspecer/core-v2";
import { Options, useOptions } from "./configuration/options";
import { getGroupMappings } from "./action/utilities";
import { synchronizeOnAggregatorChange, updateVisualAttributesBasedOnSemanticChanges } from "./dataspecer/visual-model/aggregator-to-visual-model-adapter";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { EntityDsIdentifier } from "./dataspecer/entity-model";
import { isSemanticModelAttributeProfile } from "./dataspecer/semantic-model";
import { representCardinality } from "./dialog/utilities/dialog-utilities";

const LOG = createLogger(import.meta.url);

const DEFAULT_MODEL_COLOR = configuration().defaultModelColor;

export const Visualization = () => {
  const options = useOptions();
  const graph = useModelGraphContext();
  const actions = useActions();
  const classesContext = useClassesContext();

  const aggregatorView = graph.aggregatorView;
  const activeVisualModel = useMemo(() => aggregatorView.getActiveVisualModel(), [aggregatorView]);

  // Register a callback with aggregator for visualization
  // - remove what has been removed from the visualization state
  // - update entities that have been updated
  //   - rerender updated classes
  //   - if they have updated attributes, update them as well
  //   - collect updated relationships and relationship profiles - rerender them after classes are on the canvas
  // the callback is registered for twice
  // - first time for the semantic information about the models
  //   - new relationship between two classes
  //   - new attribute for a class
  //   - rename of a concept
  // - second time for the visual information from the active visual model
  //   - change of visibility, position
  useEffect(() => {

    const previousEntities = aggregatorView.getEntities();
    const unsubscribeSemanticAggregatorCallback = aggregatorView.subscribeToChanges((updated, removed) => {
      console.log("[VISUALIZATION] SemanticModelAggregatorView.subscribeToChanges", { updated, removed });
      if (isWritableVisualModel(activeVisualModel)) {
        synchronizeOnAggregatorChange(activeVisualModel, updated, removed);
        updateVisualAttributesBasedOnSemanticChanges(activeVisualModel, updated, removed, previousEntities);
      }
    });

    const unsubscribeCanvasCallback = aggregatorView.getActiveVisualModel()?.subscribeToChanges({
      modelColorDidChange(model) {
        if (activeVisualModel === null) {
          return;
        }
        // We ignore model color changes here for now.
        console.log("[VISUALIZATION] VisualModel.subscribeToChanges.modelColorDidChange", { model });
        propagateVisualModelColorChangesToVisualization(
          options, activeVisualModel, actions.diagram, aggregatorView, classesContext, graph,
          model
        );
      },
      visualEntitiesDidChange(changes) {
        if (activeVisualModel === null) {
          return;
        }
        console.log("[VISUALIZATION] VisualModel.subscribeToChanges.visualEntitiesDidChange", { changes });
        onChangeVisualEntities(
          options, activeVisualModel, actions.diagram, aggregatorView, classesContext, graph,
          changes,
        );
      },
    });

    return () => {
      unsubscribeSemanticAggregatorCallback?.();
      unsubscribeCanvasCallback?.();
    };

  }, [options, activeVisualModel, actions, aggregatorView, classesContext, graph]);

  // Update canvas content on view change.
  useEffect(() => {
    console.log("[VISUALIZATION] Something has changed, recreating diagram visual.", activeVisualModel);
    onChangeVisualModel(options, activeVisualModel, actions.diagram, aggregatorView, classesContext, graph);
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
  options: Options,
  visualModel: VisualModel | null,
  diagram: UseDiagramType | null,
  aggregatorView: SemanticModelAggregatorView,
  classesContext: UseClassesContextType,
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
    options, visualModel, diagram, aggregatorView, classesContext,
    graphContext, changes)
}

/**
 * Set content of nodes and edges from the visual model.
 * Effectively erase any previous content.
 *
 * TODO We call setContent which is async, we should return a promise and wait.
 */
function onChangeVisualModel(
  options: Options,
  visualModel: VisualModel | null,
  diagram: UseDiagramType | null,
  aggregatorView: SemanticModelAggregatorView,
  classesContext: UseClassesContextType,
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
  const attributes = classesContext.relationships.filter(isSemanticModelAttribute);
  const attributeUsages = classesContext.usages.filter(isSemanticModelAttributeUsage);
  const attributeProfiles = classesContext.relationshipProfiles.filter(isSemanticModelAttributeProfile);

  const profilingSources = [
    ...classesContext.classes,
    ...classesContext.relationships,
    ...classesContext.usages,
    ...classesContext.classProfiles,
    ...classesContext.relationshipProfiles,
  ];

  const nextNodes: Node[] = [];
  const nextEdges: Edge[] = [];
  const nextGroups: VisualGroup[] = [];

  const visualEntities = visualModel.getVisualEntities().values();
  const { nodeToGroupMapping } = getGroupMappings(visualModel);

  for (const visualEntity of visualEntities) {
    if (isVisualGroup(visualEntity)) {
      nextGroups.push(visualEntity);
      continue;
    } else if (isVisualNode(visualEntity)) {
      const entity = entities[visualEntity.representedEntity]?.aggregatedEntity ?? null;
      if (isSemanticModelClassUsage(entity) || isSemanticModelClass(entity)
        || isSemanticModelClassProfile(entity)) {
        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          console.error("Ignored entity for missing model.", { entity });
          continue;
        }

        const node = createDiagramNode(
          options, visualModel,
          attributes, attributeUsages, attributeProfiles, profilingSources,
          visualEntity, entity, model, nodeToGroupMapping[visualEntity.identifier] ?? null);
        nextNodes.push(node);
      }
    } else if (isVisualRelationship(visualEntity)) {
      const entity = entities[visualEntity.representedRelationship]?.aggregatedEntity ?? null;
      const isRelationship =
        isSemanticModelRelationship(entity) ||
        isSemanticModelRelationshipUsage(entity) ||
        isSemanticModelRelationshipProfile(entity) ||
        isSemanticModelGeneralization(entity);
      if (isRelationship) {
        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          console.error("Ignored entity for missing model.", { entity });
          continue;
        }
        const edge = createDiagramEdge(
          options, visualModel, profilingSources, visualEntity, entity);
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
      if (isSemanticModelClassUsage(entity)) {
        profiled.push(entity.usageOf);
      } else if (isSemanticModelClassProfile(entity)) {
        profiled.push(...entity.profiling);
      } else {
        console.error("Ignored profile relation as entity is not a usage or a profile.", { entity });
        continue;
      }
      // We can have multiple candidates, but we can add only the one represented
      // by the VisualProfileRelationship.
      for (const item of profiled) {
        const profileOf = visualModel.getVisualEntityForRepresented(item);
        if (profileOf === null) {
          continue;
        }
        if (visualEntity.visualSource !== profileOf.identifier &&
          visualEntity.visualTarget !== profileOf.identifier) {
          // The VisualProfileRelationship represents different profile relationship.
          continue;
        }
        const edge = createDiagramEdgeForClassUsageOrProfile(visualModel, visualEntity, entity);
        if (edge !== null) {
          nextEdges.push(edge);
        }
      }
    }
    // For now we ignore all other.
  }

  const groupsToSetContentWith = nextGroups.map(visualGroup => {
    return {
      group: createGroupNode(visualGroup),
      content: visualGroup.content,
    };
  });
  void diagram.actions().setContent(nextNodes, nextEdges, groupsToSetContentWith);
}

function createGroupNode(
  visualGroup: VisualGroup,
): Group {
  return {
    identifier: visualGroup.identifier,
  };
}

function createDiagramNode(
  options: Options,
  visualModel: VisualModel,
  attributes: SemanticModelRelationship[],
  attributesUsages: SemanticModelRelationshipUsage[],
  attributesProfiles: SemanticModelRelationshipProfile[],
  profilingSources: (
    | SemanticModelClass | SemanticModelRelationship
    | SemanticModelClassUsage | SemanticModelRelationshipUsage
    | SemanticModelClassProfile | SemanticModelRelationshipProfile)[],
  visualNode: VisualNode,
  entity: SemanticModelClass | SemanticModelClassUsage | SemanticModelClassProfile,
  model: EntityModel,
  group: string | null,
): Node {
  const language = options.language;

  // Here we are missing proper implementation of content.
  // See https://github.com/mff-uk/dataspecer/issues/928

  const itemCandidates: Record<string, EntityItem> = {};


  for(const attribute of attributes) {
    if(isSemanticModelAttribute(attribute) && visualNode.content.includes(attribute.id)) {
      itemCandidates[attribute.id] = {
        identifier: attribute.id,
        label: getEntityLabel(language, attribute),
        profileOf: null,
      };
    }
  }

  for(const attributeUsage of attributesUsages) {
    if(!visualNode.content.includes(attributeUsage.id)) {
      continue;
    }

    const profileOf = profilingSources.find(
      (item) => item.id === attributeUsage.usageOf);
    const {range} = getDomainAndRange(attributeUsage);
    const cardinality = representCardinality(range?.cardinality).label;
    itemCandidates[attributeUsage.id] = {
      identifier: attributeUsage.id,
      label: getEntityLabel(language, attributeUsage) + " [" + cardinality + "]",
      profileOf: {
        label: profileOf === undefined ? "" : getEntityLabel(language, profileOf),
        usageNote: getUsageNote(language, attributeUsage),
      },
    }
  }


  for (const attributeProfile of attributesProfiles) {
    if(!visualNode.content.includes(attributeProfile.id)) {
      continue;
    }

    const profileOf = profilingSources.filter(
      item => attributeProfile.ends.find(edge => edge.profiling.includes(item.id)) !== undefined);
    const {range} = getDomainAndRange(attributeProfile);
    const cardinality = representCardinality(range?.cardinality).label;
    itemCandidates[attributeProfile.id] = {
      identifier: attributeProfile.id,
      label: getEntityLabel(language, attributeProfile) + " [" + cardinality + "]",
      profileOf: {
        label: profileOf.map(item => getEntityLabel(language, item)).join(", "),
        usageNote: profileOf.map(item => getUsageNote(language, item)).join(", "),
      },
    }
  }

  // Here we could filter using the visualNode.content.
  // Be aware that the update of the semantic attributes comes later,
  // so there is moment when the content of visual node is set,
  // but the corresponding attributes semantic model in are not.
  const items: EntityItem[] = visualNode.content.map(id => itemCandidates[id]).filter(item => item !== undefined);


  const isProfile = isSemanticModelClassUsage(entity)
    || isSemanticModelClassProfile(entity);

  let profileOf: (
    | SemanticModelClass | SemanticModelRelationship
    | SemanticModelClassUsage | SemanticModelRelationshipUsage
    | SemanticModelClassProfile | SemanticModelRelationshipProfile)[] = [];

  if (isSemanticModelClassUsage(entity)) {
    const profile = profilingSources.find(item => item.id === entity.usageOf);
    if (profile !== undefined) {
      profileOf.push(profile);
    }
  } else if (isSemanticModelClassProfile(entity)) {
    profileOf = profilingSources.filter(item => entity.profiling.includes(item.id));
  }

  return {
    type: isProfile ? NodeType.ClassProfile : NodeType.Class,
    identifier: visualNode.identifier,
    externalIdentifier: entity.id,
    label: getEntityLabel(language, entity),
    iri: getIri(entity, getModelIri(model)),
    color: visualModel.getModelColor(visualNode.model) ?? DEFAULT_MODEL_COLOR,
    description: getEntityDescription(language, entity),
    group,
    position: {
      ...visualNode.position
    },
    profileOf: !isProfile ? null : {
      label: profileOf.map(item => getEntityLabel(language, item)).join(", "),
      usageNote: getUsageNote(language, entity),
    },
    items,
  };
}

function getEntityLabel(
  language: string,
  entity: SemanticModelClass | SemanticModelRelationship |
    SemanticModelClassUsage | SemanticModelRelationshipUsage |
    SemanticModelClassProfile | SemanticModelRelationshipProfile
) {
  return getLocalizedStringFromLanguageString(getNameLanguageString(entity), language)
    ?? getFallbackDisplayName(entity) ?? "";
}

function getEntityDescription(
  language: string,
  entity: SemanticModelClass | SemanticModelRelationship |
    SemanticModelClassUsage | SemanticModelRelationshipUsage |
    SemanticModelClassProfile | SemanticModelRelationshipProfile) {
  return getLocalizedStringFromLanguageString(getDescriptionLanguageString(entity), language);
}

function getUsageNote(
  language: string,
  entity: SemanticModelClass | SemanticModelRelationship |
    SemanticModelClassUsage | SemanticModelRelationshipUsage |
    SemanticModelClassProfile | SemanticModelRelationshipProfile) {
  return getLocalizedStringFromLanguageString(getUsageNoteLanguageString(entity), language);
}

function createDiagramEdge(
  options: Options,
  visualModel: VisualModel,
  profilingSources: (
    | SemanticModelClass | SemanticModelRelationship
    | SemanticModelClassUsage | SemanticModelRelationshipUsage
    | SemanticModelClassProfile | SemanticModelRelationshipProfile)[],
  visualNode: VisualRelationship,
  entity: SemanticModelRelationship | SemanticModelRelationshipUsage |
    SemanticModelGeneralization | SemanticModelRelationshipProfile,
): Edge | null {
  const identifier = entity.id;
  if (isSemanticModelRelationship(entity)) {
    return createDiagramEdgeForRelationship(
      options, visualModel, profilingSources, visualNode, entity);
  } else if (isSemanticModelRelationshipUsage(entity)
    || isSemanticModelRelationshipProfile(entity)) {
    return createDiagramEdgeForRelationshipProfile(
      options, visualModel, profilingSources, visualNode, entity);
  } else if (isSemanticModelGeneralization(entity)) {
    return createDiagramEdgeForGeneralization(
      visualModel, visualNode, entity);
  }
  throw Error(`Unknown entity type ${identifier}.`);
}

function createDiagramEdgeForRelationship(
  options: Options,
  visualModel: VisualModel,
  profilingSources: (
    | SemanticModelClass | SemanticModelRelationship
    | SemanticModelClassUsage | SemanticModelRelationshipUsage
    | SemanticModelClassProfile | SemanticModelRelationshipProfile)[],
  visualNode: VisualRelationship,
  entity: SemanticModelRelationship,
): Edge {
  const language = options.language;

  const profileOf =
    (isSemanticModelRelationshipUsage(entity)
      ? profilingSources.find((e) => e.id === entity.usageOf)
      : null
    ) ?? null;

  const { domain, range } = getDomainAndRange(entity);

  return {
    type: EdgeType.Association,
    identifier: visualNode.identifier,
    externalIdentifier: entity.id,
    label: getEntityLabel(language, entity),
    source: visualNode.visualSource,
    cardinalitySource: cardinalityToHumanLabel(domain?.cardinality),
    target: visualNode.visualTarget,
    cardinalityTarget: cardinalityToHumanLabel(range?.cardinality),
    color: visualModel.getModelColor(visualNode.model) ?? DEFAULT_MODEL_COLOR,
    waypoints: visualNode.waypoints,
    profileOf: profileOf === null ? null : {
      label: getEntityLabel(language, profileOf),
      usageNote: getUsageNote(language, entity),
    },
  };
}

function createDiagramEdgeForRelationshipProfile(
  options: Options,
  visualModel: VisualModel,
  profilingSources: (
    | SemanticModelClass | SemanticModelRelationship
    | SemanticModelClassUsage | SemanticModelRelationshipUsage
    | SemanticModelClassProfile | SemanticModelRelationshipProfile)[],
  visualNode: VisualRelationship,
  entity: SemanticModelRelationshipUsage | SemanticModelRelationshipProfile,
): Edge {
  const language = options.language;

  const profileOf =
    (isSemanticModelRelationshipUsage(entity)
      ? profilingSources.find((e) => e.id === entity.usageOf)
      : null
    ) ?? null;

  const { domain, range } = getDomainAndRange(entity);

  return {
    type: EdgeType.Association,
    identifier: visualNode.identifier,
    externalIdentifier: entity.id,
    label: "<<profile>>\n" + getEntityLabel(language, entity),
    source: visualNode.visualSource,
    cardinalitySource: cardinalityToHumanLabel(domain?.cardinality),
    target: visualNode.visualTarget,
    cardinalityTarget: cardinalityToHumanLabel(range?.cardinality),
    color: visualModel.getModelColor(visualNode.model) ?? DEFAULT_MODEL_COLOR,
    waypoints: visualNode.waypoints,
    profileOf: profileOf === null ? null : {
      label: getEntityLabel(language, profileOf),
      usageNote: getUsageNote(language, entity),
    },
  };
}

function createDiagramEdgeForGeneralization(
  visualModel: VisualModel,
  visualNode: VisualRelationship,
  entity: SemanticModelGeneralization,
): Edge {
  return {
    type: EdgeType.Generalization,
    identifier: visualNode.identifier,
    externalIdentifier: entity.id,
    label: null,
    source: visualNode.visualSource,
    cardinalitySource: null,
    target: visualNode.visualTarget,
    cardinalityTarget: null,
    color: visualModel.getModelColor(visualNode.model) ?? DEFAULT_MODEL_COLOR,
    waypoints: visualNode.waypoints,
    profileOf: null,
  };
}

function createDiagramEdgeForClassUsageOrProfile(
  visualModel: VisualModel,
  visualNode: VisualProfileRelationship,
  entity: SemanticModelClassUsage | SemanticModelClassProfile,
): Edge | null {

  return {
    type: EdgeType.ClassProfile,
    identifier: visualNode.identifier,
    externalIdentifier: entity.id,
    label: "<<profile>>",
    source: visualNode.visualSource,
    cardinalitySource: null,
    target: visualNode.visualTarget,
    cardinalityTarget: null,
    color: visualModel.getModelColor(visualNode.model) ?? DEFAULT_MODEL_COLOR,
    waypoints: visualNode.waypoints,
    profileOf: null,
  };
}

/**
 * This method is also called when there is a change in model color!
 */
function onChangeVisualEntities(
  options: Options,
  visualModel: VisualModel | null,
  diagram: UseDiagramType | null,
  aggregatorView: SemanticModelAggregatorView,
  classesContext: UseClassesContextType,
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
  const attributes = classesContext.relationships.filter(isSemanticModelAttribute);
  const attributeUsages = classesContext.usages.filter(isSemanticModelAttributeUsage);
  const attributeProfiles = classesContext.relationshipProfiles.filter(isSemanticModelAttributeProfile);

  const profilingSources = [
    ...classesContext.classes,
    ...classesContext.relationships,
    ...classesContext.usages,
    ...classesContext.classProfiles,
    ...classesContext.relationshipProfiles,
  ];

  const actions = diagram.actions();

  const groups = changes.filter(({ previous, next }) => (previous !== null && isVisualGroup(previous)) || (next !== null && isVisualGroup(next)));

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
    const nextVisualGroup = next as VisualGroup;        // Have to cast, even though we know the type
    const group = createGroupNode(nextVisualGroup);

    if (previous === null) {
      // Create new entity.
      actions.addGroups([{ group, content: nextVisualGroup.content }], false);
      nextVisualGroup.content.forEach(nodeIdGroupId => {
        nodeIdToParentGroupIdMap[nodeIdGroupId] = group.identifier;
      });
    }
    else {          // Change of existing - occurs when removing node from canvas
      actions.setGroup(group, nextVisualGroup.content);
    }
  }

  for (const { previous, next } of changes) {
    if (next !== null) {
      // New or changed entity.
      if (isVisualNode(next)) {
        const entity = entities[next.representedEntity]?.aggregatedEntity ?? null;

        if (!isSemanticModelClass(entity)
          && !isSemanticModelClassUsage(entity)
          && !isSemanticModelClassProfile(entity)) {
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
          options, visualModel,
          attributes, attributeUsages, attributeProfiles, profilingSources,
          next, entity, model, group);

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
          isSemanticModelRelationshipUsage(entity) ||
          isSemanticModelGeneralization(entity) ||
          isSemanticModelRelationshipProfile(entity);
        if (!isRelationship) {
          console.error("In visual update semantic entity is not a relationship.", { entity, visual: next });
          continue;
        }

        const model = findSourceModelOfEntity(entity.id, models);
        if (model === null) {
          console.error("Ignored entity for missing model.", { entity });
          continue;
        }

        const edge = createDiagramEdge(options, visualModel, profilingSources, next, entity);

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
        if (isSemanticModelClassUsage(entity)) {
          profiled.push(entity.usageOf);
        } else if (isSemanticModelClassProfile(entity)) {
          profiled.push(...entity.profiling);
        } else {
          console.error("Ignored profile relation as entity is not a usage or a profile.", { entity, visualEntity: next });
          continue;
        }
        // We can have multiple candidates, but we can add only the one represented
        // by the VisualProfileRelationship.
        for (const item of profiled) {
          const profileOf = visualModel.getVisualEntityForRepresented(item);
          if (profileOf === null) {
            continue;
          }
          if (next.visualSource !== profileOf.identifier &&
            next.visualTarget !== profileOf.identifier) {
            // The VisualProfileRelationship represents different profile relationship.
            continue;
          }
          //
          const edge = createDiagramEdgeForClassUsageOrProfile(visualModel, next, entity);
          if (edge === null) {
            console.error("Ignored null edge.", { visualEntity: next, entity });
            continue;
          }
          if (previous === null) {
            // Create new entity.
            actions.addEdges([edge]);
          } else {
            // Change of existing.
            actions.updateEdges([edge]);
          }
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
      } else {
        // We ignore other properties.
      }
    }
  }
}
