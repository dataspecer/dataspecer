import { isControlledVocabulary, type ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { CONTROLLED_VOCABULARY_MODEL } from "@dataspecer/core-v2/model/known-models";
import { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship, type SemanticModelRelationshipEnd } from "@dataspecer/core-v2/semantic-model/concepts";
import { isControlledVocabularyAssignment, type ControlledVocabularyAssignment } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { DataPsmResource } from "@dataspecer/core/data-psm/model/data-psm-resource";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ProjectModelEntity } from "@dataspecer/core/project-model";
import { getDataSpecificationWithModels } from "@dataspecer/specification/specification";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";

export interface SemanticModelClassWithConceptIris extends SemanticModelClass {
  /**
   * List of IRIs of the original entity that were referenced by the profile.
   */
  conceptIris?: string[];
}

export interface SemanticModelRelationshipWithConceptIris extends SemanticModelRelationship {
  ends: (SemanticModelRelationshipEnd & {
    /**
     * List of IRIs of the original entity that were referenced by the profile.
     */
    conceptIris?: string[];
  })[];
}

export type AggregatedSemanticModel = (
  SemanticModelClassWithConceptIris |
  SemanticModelRelationshipWithConceptIris |
  SemanticModelGeneralization |
  ControlledVocabularyAssignment
)[];

/**
 * The aggregated class profile lists identifiers of all controlled vocabulary
 * assignments that apply to it.
 */
interface WithControlledVocabularies {
  controlledVocabularies?: string[];
}

/**
 * Returns the aggregated semantic model, the structure models and the
 * controlled vocabularies of a project, see {@link getSpecification}.
 *
 * @param projectId Identifier of the package of the specification.
 * @param allModels All models of the project, including the project model.
 */
export function getSpecificationFromModels(
  projectId: ModelIdentifier,
  allModels: Record<ModelIdentifier, EntityRecord>,
): {
  aggregatedSemanticModel: AggregatedSemanticModel;
  structureModels: DataPsmResource[][];
  controlledVocabularies: ControlledVocabulary[];
} {
  const specification = getDataSpecificationWithModels(projectId, allModels);

  // Aggregated semantic model is a single model containing entities.
  const aggregatedWrappedEntities = specification.semanticModelAggregator.getAggregatedEntities();
  const unwrappedEntities = Object.values(aggregatedWrappedEntities).map((entity) => entity.aggregatedEntity);

  // An aggregated class profile lists also the assignments it gets from the
  // profiles it profiles. When those are in a package nested in the
  // specification, the assignments are provided by the aggregator of that
  // package only. They are added, so that every listed assignment is part of
  // the returned model.
  const includedIds = new Set(unwrappedEntities.map((entity) => entity.id));
  const referencedAssignmentIds = new Set(
    unwrappedEntities.flatMap((entity) => (entity as WithControlledVocabularies).controlledVocabularies ?? []),
  );
  for (const aggregator of specification.projectSemanticModels) {
    for (const wrappedEntity of Object.values(aggregator.getAggregatedEntities())) {
      const entity = wrappedEntity.aggregatedEntity;
      if (isControlledVocabularyAssignment(entity) && referencedAssignmentIds.has(entity.id) && !includedIds.has(entity.id)) {
        unwrappedEntities.push(entity);
        includedIds.add(entity.id);
      }
    }
  }
  const aggregatedSemanticModel = unwrappedEntities as AggregatedSemanticModel;

  // Now process structure models
  const structureModels = Object.values(specification.structureModels).map((structureModel) => {
    const resources = structureModel.listResources();
    return resources.map((resourceId) => structureModel.readResource(resourceId));
  }) as DataPsmResource[][];

  return {
    aggregatedSemanticModel,
    structureModels,
    controlledVocabularies: getControlledVocabularies(allModels),
  };
}

/**
 * Returns the controlled vocabularies of all packages of the project. The
 * vocabulary is the single entity of its model, identified by the identifier
 * of the model.
 */
function getControlledVocabularies(allModels: Record<ModelIdentifier, EntityRecord>): ControlledVocabulary[] {
  const projectModel = (allModels[PROJECT_MODEL_ID] ?? {}) as EntityRecord<ProjectModelEntity>;
  return Object.values(projectModel)
    .filter((entity) => entity.modelType === CONTROLLED_VOCABULARY_MODEL)
    .map((entity) => allModels[entity.id]?.[entity.id])
    .filter((entity): entity is ControlledVocabulary => entity !== undefined && isControlledVocabulary(entity));
}
