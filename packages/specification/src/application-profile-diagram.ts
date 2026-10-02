import {
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
  type SemanticModelEntity,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { isDataType } from "@dataspecer/core-v2/semantic-model/datatypes";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { generateVisualModelSvg } from "@dataspecer/diagram";
import { ReactflowDimensionsEstimator, getDefaultUserGivenAlgorithmConfigurationsFull, performLayoutOfSemanticModel } from "@dataspecer/layout";
import { buildModelHierarchy } from "@dataspecer/model-hierarchy";
import { isVisualNode, isVisualRelationship, type VisualEntity, type VisualNode, type VisualRelationship } from "@dataspecer/visual-model";
import { build as buildSemanticModelAggregator } from "./aggregator-builder/semantic-model-aggregator-builder.ts";

/**
 * Generates a diagram for an application profile that has no saved visual model.
 */
export async function generateApplicationProfileSvg(
  packageId: string,
  modelId: string,
  semanticModel: Record<string, SemanticModelEntity>,
  models: Record<string, EntityRecord>,
  prefixes: Record<string, string>,
): Promise<string> {
  const hierarchy = buildModelHierarchy(packageId, models);
  const aggregatedEntities = buildSemanticModelAggregator(packageId, hierarchy, models, undefined, undefined, { forcePassThrough: true }).getAggregatedEntities();
  const layoutModel = addReferencedClasses(semanticModel, models);
  const { attributesByClass, profileAttributeIds } = collectProfileAttributes(semanticModel);
  for (const id of profileAttributeIds) delete layoutModel[id];
  const layoutConfiguration = getDefaultUserGivenAlgorithmConfigurationsFull();
  layoutConfiguration.chosenMainAlgorithm = "elk_stress";
  layoutConfiguration.main.elk_stress.run_node_overlap_removal_after = true;
  layoutConfiguration.main.elk_stress.interactive = true;
  layoutConfiguration.main.elk_stress.number_of_new_algorithm_runs = 1;
  layoutConfiguration.main.elk_stress.stress_edge_len = 500;
  const result = await performLayoutOfSemanticModel(layoutModel, modelId, layoutConfiguration, new ReactflowDimensionsEstimator());
  const visualModel = createApplicationProfileVisualModel(
    Object.values(result).map(({ visualEntity }) => visualEntity),
    semanticModel,
    attributesByClass,
  );

  const diagramModels: Record<string, EntityRecord> = Object.fromEntries(
    Object.entries(models).map(([id, entities]) => [
      id,
      Object.fromEntries(Object.entries(entities).map(([entityId, entity]) => [entityId, aggregatedEntities[entityId]?.aggregatedEntity ?? entity])),
    ]),
  );
  diagramModels[modelId] = {
    ...diagramModels[modelId],
    ...Object.fromEntries(Object.entries(layoutModel).map(([id, entity]) => [id, aggregatedEntities[id]?.aggregatedEntity ?? entity])),
  };
  return generateVisualModelSvg(visualModel, diagramModels, { prefixes });
}

/** Keeps profile entities and reconnects their relationships to profile nodes. */
function createApplicationProfileVisualModel(
  layoutEntities: VisualEntity[],
  profile: Record<string, SemanticModelEntity>,
  attributesByClass: Map<string, string[]>,
): EntityRecord<VisualEntity> {
  const nodes = layoutEntities
    .filter((entity): entity is VisualNode => isVisualNode(entity) && profile[entity.representedEntity] !== undefined)
    .map((node) => ({
      ...node,
      content: [...new Set([...node.content, ...(attributesByClass.get(node.representedEntity) ?? [])])],
    }));
  const nodesById = new Map(layoutEntities.filter(isVisualNode).map((node) => [node.id, node]));
  const nodesByEntity = new Map(nodes.map((node) => [node.representedEntity, node]));
  const sourceToProfileNode = new Map<string, VisualNode>();

  for (const node of nodes) {
    const entity = profile[node.representedEntity];
    if (entity && isSemanticModelClassProfile(entity)) {
      for (const sourceId of entity.profiling) {
        if (!sourceToProfileNode.has(sourceId)) sourceToProfileNode.set(sourceId, node);
      }
    }
  }

  const result: EntityRecord<VisualEntity> = Object.fromEntries(nodes.map((node) => [node.id, node]));
  for (const edge of layoutEntities.filter((entity): entity is VisualRelationship => isVisualRelationship(entity))) {
    if (profile[edge.representedRelationship] === undefined) continue;

    const sourceEntityId = nodesById.get(edge.visualSource)?.representedEntity;
    const targetEntityId = nodesById.get(edge.visualTarget)?.representedEntity;
    const source = sourceEntityId === undefined ? undefined : (nodesByEntity.get(sourceEntityId) ?? sourceToProfileNode.get(sourceEntityId));
    const target = targetEntityId === undefined ? undefined : (nodesByEntity.get(targetEntityId) ?? sourceToProfileNode.get(targetEntityId));
    if (!source || !target) continue;

    const remappedEdge: VisualRelationship = {
      ...edge,
      visualSource: source.id,
      visualTarget: target.id,
    };
    result[edge.id] = remappedEdge;
  }

  return result;
}

/** Collects primitive attributes for display inside their owning class nodes. */
function collectProfileAttributes(profile: Record<string, SemanticModelEntity>): { attributesByClass: Map<string, string[]>; profileAttributeIds: Set<string> } {
  const classes = Object.values(profile).filter((entity) => isSemanticModelClass(entity) || isSemanticModelClassProfile(entity));
  const attributesByClass = new Map<string, string[]>();
  const profileAttributeIds = new Set<string>();

  for (const entity of Object.values(profile)) {
    const isProfileAttribute = isSemanticModelRelationshipProfile(entity) && entity.ends.some((end) => !end.concept || isDataType(end.concept));
    if (isProfileAttribute) profileAttributeIds.add(entity.id);
    if (!isProfileAttribute && !isSemanticModelAttribute(entity)) continue;

    const primitiveEnd = entity.ends.find((end) => !end.concept || isDataType(end.concept));
    if (!primitiveEnd) continue;
    const classEnd = entity.ends.find((end) => end !== primitiveEnd);
    if (!classEnd?.concept) continue;
    const classConcept = classEnd.concept;

    const owners = classes.filter((classEntity) => classEntity.id === classConcept || (isSemanticModelClassProfile(classEntity) && classEntity.profiling.includes(classConcept)));
    for (const owner of owners) {
      const ids = attributesByClass.get(owner.id) ?? [];
      ids.push(entity.id);
      attributesByClass.set(owner.id, ids);
    }
  }

  return { attributesByClass, profileAttributeIds };
}

/** Adds profile-referenced classes that the layout engine needs for edge endpoints. */
function addReferencedClasses(profile: Record<string, SemanticModelEntity>, models: Record<string, EntityRecord>): Record<string, SemanticModelEntity> {
  const result = { ...profile };
  const processed = new Set<string>();
  const pending = Object.values(profile);

  while (pending.length > 0) {
    const entity = pending.pop()!;
    if (processed.has(entity.id)) continue;
    processed.add(entity.id);

    for (const identifier of referencedEntityIds(entity)) {
      if (result[identifier] !== undefined) continue;
      const referenced = Object.values(models)
        .map((model) => model[identifier])
        .find((candidate) => candidate !== undefined && (isSemanticModelClass(candidate) || isSemanticModelClassProfile(candidate)));
      if (referenced === undefined) continue;

      const semanticEntity = referenced as SemanticModelEntity;
      result[identifier] = semanticEntity;
      pending.push(semanticEntity);
    }
  }

  return result;
}

/**
 * Returns semantic node identifiers referenced by an entity's edges or profile.
 */
function referencedEntityIds(entity: SemanticModelEntity): string[] {
  if (isSemanticModelClassProfile(entity)) return entity.profiling;
  if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity)) {
    return entity.ends.map((end) => end.concept).filter((id): id is string => id !== null);
  }
  if (isSemanticModelGeneralization(entity)) return [entity.child, entity.parent];
  return [];
}
