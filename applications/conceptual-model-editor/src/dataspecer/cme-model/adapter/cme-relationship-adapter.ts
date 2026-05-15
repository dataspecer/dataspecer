import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { CmeRelationship } from "../model";
import { selectDomainAndRange } from "./adapter-utilities";

export const semanticRelationshipToCmeRelationship = (
  semanticModel: string,
  entity: SemanticModelRelationship,
): CmeRelationship => {
  const [domain, range] = selectDomainAndRange(entity.ends);
  return {
    model: semanticModel,
    identifier: entity.id,
    iri: range.iri,
    name: range.name,
    description: range.description,
    externalDocumentationUrl: range.externalDocumentationUrl ?? null,
    domain: domain.concept,
    domainCardinality: domain.cardinality ?? null,
    range: range.concept,
    rangeCardinality: range.cardinality ?? null,
    order: range.order ?? null,
  };
};

