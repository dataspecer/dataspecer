import { CmeSemanticRelationship } from "../../cme-semantic-model/model";
import { CmeSemanticRelationshipAggregate } from "../model";

export function toCmeSemanticRelationshipAggregate(
  next: CmeSemanticRelationship,
  previous: CmeSemanticRelationshipAggregate | undefined,
): CmeSemanticRelationshipAggregate {
  if (previous === undefined) {
    return {
      type: "cme-semantic-relationship-aggregate",
      identifier: next.identifier,
      model: next.model,
      dependencies: [next.identifier],
      semanticModels: [next.model],
      iri: next.iri,
      name: next.name,
      description: next.description,
      externalDocumentationUrl: next.externalDocumentationUrl,
      domain: next.domain,
      domainCardinality: next.domainCardinality,
      range: next.range,
      rangeCardinality: next.rangeCardinality,
    };
  } else {
    return {
      type: "cme-semantic-relationship-aggregate",
      identifier: next.identifier,
      model: previous.model,
      dependencies: [next.identifier, ...previous.dependencies],
      semanticModels: [next.model, ...previous.semanticModels],
      iri: next.iri,
      name: next.name ?? previous.name,
      description: next.description ?? previous.description,
      externalDocumentationUrl:
        next.externalDocumentationUrl ?? previous.externalDocumentationUrl,
      domain: next.domain ?? previous.domain,
      domainCardinality:
        next.domainCardinality ?? previous.domainCardinality,
      range: next.range ?? previous.range,
      rangeCardinality:
        next.rangeCardinality ?? previous.rangeCardinality,
    };
  }
}
