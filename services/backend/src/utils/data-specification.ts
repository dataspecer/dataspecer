import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import type { DataPsmResource } from "@dataspecer/core/data-psm/model/data-psm-resource";
import { modelRepository } from "../main.ts";
import { AggregatedSemanticModel, getSpecificationFromModels } from "./aggregated-specification.ts";
import { getModelsForPackage } from "./backend-model-store.ts";

export type {
  AggregatedSemanticModel,
  SemanticModelClassWithConceptIris,
  SemanticModelRelationshipWithConceptIris,
} from "./aggregated-specification.ts";

/**
 * For a given project id (id/iri of a package) it returns single aggregated
 * semantic model, an array of the structure models and the controlled
 * vocabularies.
 *
 * All of them are arrays of JSON-serializable entities.
 *
 * The purpose of this function is to provide a simple API that hides the
 * complexity that may change in the future.
 */
export async function getSpecification(projectId: string): Promise<{
  /**
   * List of semantic model entities. Each entity is either a class, relationship,
   * generalization or a controlled vocabulary assignment.
   *
   * Class profiles list in `controlledVocabularies` the identifiers of all
   * controlled vocabulary assignments that apply to them.
   * The vocabulary of an assignment is identified by its `vocabulary` and is part of {@link controlledVocabularies}.
   */
  aggregatedSemanticModel: AggregatedSemanticModel;

  /**
   * Array of structure models. Each structure model is an array of resources.
   *
   * Each structure model has one {@link DataPsmSchema} that is the root of the
   * structure model.
   */
  structureModels: DataPsmResource[][];

  /**
   * Controlled vocabularies of the project, including the ones from the nested packages.
   * A vocabulary is identified by its `id`.
   */
  controlledVocabularies: ControlledVocabulary[];
}> {
  const allModels = await getModelsForPackage(projectId, modelRepository);
  return getSpecificationFromModels(projectId, allModels);
}
