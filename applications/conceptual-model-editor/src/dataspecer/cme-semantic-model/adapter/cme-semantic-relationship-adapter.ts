import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { CME_SEMANTIC_RELATIONSHIP, CmeSemanticRelationship } from "../model";
import { ModelDsIdentifier } from "../../entity-model";
import { selectDomainAndRange } from "../../semantic-model/semantic-model-utilities";

export function toCmeSemanticRelationship(
  model: ModelDsIdentifier,
  readOnly: boolean,
  value: SemanticModelRelationship,
): CmeSemanticRelationship {
  const [domain, range] = selectDomainAndRange(value.ends);
  return {
    type: [CME_SEMANTIC_RELATIONSHIP],
    model,
    identifier: value.id,
    iri: range.iri,
    name: range.name,
    description: range.description,
    externalDocumentationUrl: range.externalDocumentationUrl ?? null,
    domain: domain.concept,
    domainCardinality: domain.cardinality ?? null,
    range: range.concept,
    rangeCardinality: range.cardinality ?? null,
    readOnly,
  }
}
