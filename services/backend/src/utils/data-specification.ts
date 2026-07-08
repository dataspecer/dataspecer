import { getDataSpecificationWithModels } from "@dataspecer/specification/specification";
import type {
  DataspecerAggregatedSemanticModel,
  DataspecerSpecificationSource,
  DataspecerStructureResource,
} from "@dataspecer/app-generator";
import { resourceModel } from "../main.ts";
import { BackendModelRepository } from "./model-repository.ts";

/**
 * For a given project id (id/iri of a package) it returns single aggregated
 * semantic model and an array of the structure models.
 *
 * Both semantic and structure models are array of JSON-serializable entities.
 *
 * The purpose of this function is to provide a simple API that hides the
 * complexity that may change in the future.
 */
export async function getSpecification(projectId: string): Promise<DataspecerSpecificationSource> {
  const modelRepository = new BackendModelRepository(resourceModel);
  const specification = await getDataSpecificationWithModels(projectId, "", modelRepository);

  // Aggregated semantic model is a single model containing entities.
  const aggregatedWrappedEntities = specification.semanticModelAggregator.getAggregatedEntities();
  const unwrappedEntities = Object.values(aggregatedWrappedEntities).map((entity) => entity.aggregatedEntity);
  const aggregatedSemanticModel = unwrappedEntities as DataspecerAggregatedSemanticModel;

  // Now process structure models
  const structureModels = Object.values(specification.structureModels).map((structureModel) => {
    const resources = structureModel.listResources();
    return resources.map((resourceId) => structureModel.readResource(resourceId));
  }) as DataspecerStructureResource[][];

  return {
    aggregatedSemanticModel,
    structureModels,
  };
}
