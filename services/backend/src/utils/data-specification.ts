import { getDataSpecificationWithModels } from "@dataspecer/specification/specification";
import { resourceModel } from "../main.ts";
import { BackendModelRepository } from "./model-repository.ts";
import { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship, type SemanticModelRelationshipEnd } from "@dataspecer/core-v2/semantic-model/concepts";
import type { DataPsmResource } from "@dataspecer/core/data-psm/model/data-psm-resource";

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

export type AggregatedSemanticModel = (SemanticModelClassWithConceptIris | SemanticModelRelationshipWithConceptIris | SemanticModelGeneralization)[];

/**
 * For a given project id (id/iri of a package) it returns single aggregated
 * semantic model and an array of the structure models.
 *
 * Both semantic and structure models are array of JSON-serializable entities.
 *
 * The purpose of this function is to provide a simple API that hides the
 * complexity that may change in the future.
 */
export async function getSpecification(projectId: string): Promise<{
  /**
   * List of semantic model entities. Each entity is either a class, relationship or generalization.
   */
  aggregatedSemanticModel: AggregatedSemanticModel;

  /**
   * Array of structure models. Each structure model is an array of resources.
   *
   * Each structure model has one {@link DataPsmSchema} that is the root of the
   * structure model.
   */
  structureModels: DataPsmResource[][];
}> {
  const modelRepository = new BackendModelRepository(resourceModel);
  const specification = await getDataSpecificationWithModels(projectId, "", modelRepository);

  // Aggregated semantic model is a single model containing entities.
  const aggregatedWrappedEntities = specification.semanticModelAggregator.getAggregatedEntities();
  const unwrappedEntities = Object.values(aggregatedWrappedEntities).map((entity) => entity.aggregatedEntity);
  const aggregatedSemanticModel = unwrappedEntities as AggregatedSemanticModel;

  // Now process structure models
  const structureModels = Object.values(specification.structureModels).map((structureModel) => {
    const resources = structureModel.listResources();
    return resources.map((resourceId) => structureModel.readResource(resourceId));
  }) as DataPsmResource[][];

  return {
    aggregatedSemanticModel,
    structureModels,
  };
}
