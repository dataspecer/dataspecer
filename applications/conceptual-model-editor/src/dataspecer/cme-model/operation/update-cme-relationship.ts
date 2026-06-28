import { modifyRelation } from "@dataspecer/core-v2/semantic-model/operations";
import { CmeRelationship } from "../model";
import { DataspecerError } from "../../dataspecer-error";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

/**
 * @throws DataspecerError
 */
export function updateCmeRelationship(
  model: InMemorySemanticModel,
  next: CmeRelationship,
) {
  const operation = modifyRelation(next.identifier, {
    ends: [{
      iri: null,
      name: {},
      description: {},
      concept: next.domain,
      cardinality: next.domainCardinality ?? undefined,
    }, {
      iri: next.iri,
      name: next.name ?? {},
      description: next.description ?? {},
      concept: next.range,
      cardinality: next.rangeCardinality ?? undefined,
      externalDocumentationUrl: next.externalDocumentationUrl ?? null,
      order: next.order ?? null,
    }]
  })

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
