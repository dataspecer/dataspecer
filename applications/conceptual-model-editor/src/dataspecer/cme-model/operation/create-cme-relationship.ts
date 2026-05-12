import { CreatedEntityOperationResult, createRelationship } from "@dataspecer/core-v2/semantic-model/operations";
import { CmeReference, NewCmeRelationship } from "../model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";

/**
 * @throws DataspecerError
 */
export function createCmeRelationship(
  model: InMemorySemanticModel,
  value: NewCmeRelationship,
): CmeReference {
  const operation = createRelationship({
    ends: [{
      iri: null,
      name: {},
      description: {},
      concept: value.domain,
      cardinality: value.domainCardinality ?? undefined,
    }, {
      name: value.name ?? {},
      description: value.description ?? {},
      concept: value.range,
      cardinality: value.rangeCardinality ?? undefined,
      iri: value.iri,
      externalDocumentationUrl: value.externalDocumentationUrl ?? null,
      order: value.order ?? undefined,
    }]
  });

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
  return {
    identifier: (result as CreatedEntityOperationResult).id,
    model: model.getId(),
  };
}
